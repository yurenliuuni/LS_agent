# LinkSpace 的 完整後端應用，基於 FastAPI 框架建構，提供：
# RESTful API：涵蓋使用者註冊登入、遊戲模式查詢、遊戲會話記錄、俱樂部管理、活動報名、每日健康記錄、主題活動與視覺訓練會話。
# WebSocket 即時串流：/ws/vision/{client_id} 支援即時姿態偵測與相似度比對，適用於運動訓練或體感遊戲。
# 認證授權：使用 JWT（Bearer Token），提供 Email/Password 登入（未來可擴充錢包簽章登入）。
# 資料庫：非同步 SQLAlchemy（asyncpg），連線至 PostgreSQL，並在啟動時自動建立資料表。
# 視覺服務整合：呼叫自訂的 PoseEstimator（基於 MediaPipe）與 PoseSimilarityEngine（比對動作相似度），透過 WebSocket 回傳即時分數、關節偏差與 HUD 畫面。


#主要模組功能 
# 路由群組	功能
# /auth	註冊、登入（回傳 JWT）
# /users	取得個人資料、查詢他人統計（總場次、最高分、俱樂部數等）
# /games	取得遊戲模式列表、建立遊戲會話、排行榜（依期間與模式篩選）
# /vision	建立視覺訓練會話、查詢歷史會話、單幀分析、從影片提取參考動作序列
# /clubs	建立俱樂部、列表、加入俱樂部（自動設為管理員）
# /events	建立活動、列表、報名活動
# /records	上傳與查詢每日健康數據
# /themes	列出主題收藏（支援啟用篩選）
# /ws/vision	WebSocket 雙向通訊，即時傳送影像幀，回傳比對結果與註解畫面

# design philosophy
# all database 操作使用非同步 session , 避免阻塞 event loop （導致服務暫停）最好的方式就是丟給 database 去處理
# 使用 selectinload 與 select 進行明確查詢，減少 N+1 問題（一種資料庫查詢效率極低的情境，因為資料中的迴圈分次執行，產生網路延遲（Network RTT）累積： 每次查詢都需要在應用程式伺服器與資料庫之間進行一次往返（Round-Trip Time）。無數次小查詢的延遲總和，遠高於一次性抓取大量資料的時間。資料庫效能暴跌： 大量重複的 SQL 解析、連線管理與開銷，容易導致資料庫 CPU 使用率飆高，甚至耗盡連線池（Connection Pool）。） 
# 登入驗證僅比對 Email，無密碼雜湊（本範例略過密碼驗證，僅產生 Token，實際應加入 pwd_context.verify）。
# WebSocket 連線管理使用自訂 VisionConnectionManager，維護客戶端狀態。 前端可以持續傳送影像幀（例如每秒傳 30 張相機畫面），伺服器也可以隨時主動推播比對結果給前端，延遲極低，適合做遊戲或即時運動姿態偵測。
# 即時比對引擎 RealtimePoseMatcher 維持 Combo 計數與最佳 Combo，並提供 HUD 覆蓋。HUD（Heads-Up Display，抬頭顯示器）：源自戰鬥機或電子遊戲，指直接疊加在畫面上的資訊介面（例如：賽車遊戲畫面上方顯示的速度表、玩家血條、Combo 連擊次數）。HUD 覆蓋：伺服器接到運動姿態畫面後，進行骨骼點比對，並在影像畫面上直接疊加骨架線條、得分、綠色（正確）/紅色（錯誤）的提示圈或 Combo 數字，再傳回畫面上呈現給使用者。


"""
LinkSpace API — Full Backend with Vision Training
FastAPI application with REST endpoints + WebSocket real-time pose streaming.
"""
import asyncio #asynchronous IO, for non-blocking task and improve concurrency 
import base64 #turn binary data like image to base 64, used for websocket
import json
import logging #system log 
import os
import time

#manage setup and teardown operations for asynchronous resources like database or network sockets
from contextlib import asynccontextmanager #a built-in Python decorator that converts an asynchronous generator function into an asynchronous context manager
from datetime import datetime, timedelta
from typing import Dict, List, Optional #type hints 
from uuid import UUID

#computer vision and data process
import cv2
import numpy as np

#a modern, fast(high performance), open source web framework for building APIs with Python based on standard Python type hints 
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer

#cybersecurity 
from jose import JWTError, jwt #生成、解碼與驗證 JWT（JSON Web Token），實作使用者登入狀態維護。
from passlib.context import CryptContext #密碼雜湊工具，通常搭配 bcrypt 演算法，用於使用者密碼的加密儲存與比對。

#資料庫 ORM object relation mapping (SQLAlchemy)
from sqlalchemy import create_engine, func, desc
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload #預載入（Eager Loading）語法，專門用於解決 N+1 查詢問題。

#專案自訂模組（Local Custom Modules）
# Import ORM models 
from models import (
    Base, User, GameMode, GameSession, Club, ClubMember, Event, EventParticipant,
    DailyRecord, ThemeCollection, VisionSession
)
# Import Pydantic schemas
from schemas import (
    UserCreate, UserResponse, UserProfile, LoginRequest, Token,
    GameModeResponse, GameSessionCreate, GameSessionResponse,
    LeaderboardResponse, LeaderboardEntry,
    VisionSessionCreate, VisionSessionResponse, VisionFrameResult,
    ClubCreate, ClubResponse, ClubMemberResponse,
    EventCreate, EventResponse,
    DailyRecordCreate, DailyRecordResponse,
    ThemeCollectionResponse
)
# Custom vision services (pose estimation, similarity engine)
from vision_service import PoseEstimator, PoseFrame, Landmark3D, encode_frame_to_base64
from pose_similarity import PoseSimilarityEngine, RealtimePoseMatcher, SimilarityResult, PoseQuality

# ---------- Configuration ---------- #系統運作所需的靜態常數與外部資源定址，定義了系統與外部資料庫、快取和密鑰的邊界。
load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://linkspace:linkspace@localhost:5432/linkspace",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Logging setup
logging.basicConfig(level=logging.INFO)  # 設定全域日誌記錄器（Root Logger）的基礎組態。將日誌紀錄的最低門檻設為 INFO 層級。這代表 INFO、WARNING、ERROR 與 CRITICAL 訊息會被輸出，而更細節的 DEBUG 訊息將被忽略。
logger = logging.getLogger("linkspace.api") # 建立或獲取一個指定命名空間為 "linkspace.api" 的獨立 Logger 物件。 細節：用於在後續程式碼中紀錄專屬此 API 模組的運作日誌（例如 logger.info("...")）。

# Async SQLAlchemy engine and session factory
async_engine = create_async_engine(DATABASE_URL, echo=False, pool_size=20, max_overflow=40) #建立 SQLAlchemy 的異步資料庫引擎（Async Engine）。# DATABASE_URL：資料庫連線字串（例如 postgresql+asyncpg://...）。echo=False：設為 False 代表關閉 SQL 語法印出，避免在生產環境中輸出過多日誌影響效能。pool_size=20：連線池（Connection Pool）保持常駐的基礎連線數量為 20 個。max_overflow=40：當併發請求高於連線池常駐量時，最多允許額外暫時建立 40 個 臨時連線（系統上限連線數為 $20 + 40 = 60$ 個）。
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)  #建立異步資料庫會話的工廠函式（Session Factory）。 expire_on_commit = false 指在asynchronous時，並不要求將未同步的資料作為過期，好處是避免 async 環境下的同步阻塞錯誤synchronous blocking in an asynchronous environment（event loop）、不需要重新sql query 拿到舊資料也不會error 壞處是拿到的資料可能是舊的

# Password hashing context (bcrypt) – used for verifying passwords in login
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") #initialize Passlib 的密碼加密與比對上下文物件。#schemes=["bcrypt"]：指定主要使用 bcrypt 演算法來進行密碼雜湊（Hash）與驗證。deprecated="auto"：若未來演算法變更，會自動將舊的演算法標記為棄用，並在使用者登入時將舊密碼自動升級為新演算法。
# OAuth2 scheme for extracting Bearer token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login") # declare dependency on  Bearer Token of FastAPI（持票人權杖），是一種常見的 API 驗證方式，只要「持有」這串代碼就能存取資料，它會自動從傳入 HTTP Request Header 的 Authorization: Bearer <token> 欄位提取 JWT Token。tokenUrl="auth/login"：供 FastAPI 自動產生的 OpenAPI/Swagger UI 互動式文件使用，指明獲取 Token 的登入 API 端點路徑。

# Global singleton for pose estimator (lazy initialization)
_pose_estimator: Optional[PoseEstimator] = None #沒有很懂，宣告一個私有全域變數，作為 PoseEstimator（姿態估計器）實體的快取容器，預設值為 None。細節：這是實現惰性載入（Lazy Initialization）的第一步，避免在系統一開機就載入昂貴的 AI 模型。

def get_pose_estimator() -> PoseEstimator:
    """Return a singleton PoseEstimator instance (MediaPipe based)."""
    global _pose_estimator #宣告在函式內部可以修改外層的全域變數 _pose_estimator
    if _pose_estimator is None:
        _pose_estimator = PoseEstimator(
            static_image_mode=False, #set as stream.video mode 
            model_complexity=1,          # Balanced performance/accuracy, 模型複雜度設為 1（0 為最快但精度低，2 為最準但耗資源，1 是效能與精準度的平衡點）
            min_detection_confidence=0.5, 
            min_tracking_confidence=0.5,
        )
    return _pose_estimator #回傳全局唯一的 PoseEstimator 實體，確保整台伺服器重複利用同一份模型資源，節省記憶體空間。


# ---------- Lifespan & App Initialization ----------
# 1. set up  Fast API start and close process
# 2. instantiate 建立所有 datatable in model.py
# 3. 關閉時釋放資料庫連線
@asynccontextmanager #使用 @asynccontextmanager，代表這是一個非同步的 context manager。
async def lifespan(app: FastAPI):  
    """
    Lifespan context manager: runs on startup/shutdown. lifespan 是 FastAPI 用來管理「啟動前」與「關閉後」事件的函式。
    Creates database tables (if not exist) and disposes engine on exit.
    Logic: 啟動時執行 yield 之前的程式碼->應用程式開始接收請求->關閉時執行 yield 之後的程式碼

    """
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await _seed_game_modes()
    except Exception as e:
        logger.error("Database init failed (%s). Vision WebSocket still available.", e)
    yield
    await async_engine.dispose()

# Create FastAPI app with lifespan handler
app = FastAPI(title="LinkSpace API", version="2.0.0", lifespan=lifespan) #FastAPI 主程式實體

# CORS middleware – allow all origins for development (restrict in production)
# 設定 CORS 跨域 middleware,  Cross-Origin Resource Sharing 當前端與後端不同網域、不同埠號或不同協定時，瀏覽器會受到同源政策限制。
# 1. 允許所有來源進行跨域請求。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_GAME_MODES = [
    {
        "slug": "poomsae",
        "name": "Taekwondo Poomsae",
        "description": "Real-time pose detection training",
        "category": "virtual",
    },
    {
        "slug": "breaking",
        "name": "Breaking",
        "description": "Real-time pose detection training",
        "category": "virtual",
    },
    {
        "slug": "boxing",
        "name": "Boxing",
        "description": "Real-time pose detection training",
        "category": "virtual",
    },
    {
        "slug": "fitsport",
        "name": "Fit sport",
        "description": "Real-time pose detection training",
        "category": "virtual",
    },
]


async def _seed_game_modes():
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(GameMode).limit(1))
        if existing.scalars().first():
            return
        for item in DEFAULT_GAME_MODES:
            session.add(GameMode(**item, is_active=True))
        await session.commit()
        logger.info("Seeded default game modes.")


# ---------- Database Dependency ----------
# a database dependency function, providing asynchronous db session to the route as each HTTP request coming 
async def get_db():
    """Provide an async database session per request."""
    async with AsyncSessionLocal() as session: #當請求結束後，async with 會自動關閉並釋放這個 session，因此可以確保每個請求使用自己的資料庫連線，避免 session 共用造成資料狀態互相污染，同時也能簡化路由中的資料庫操作與資源管理。
        yield session 


# ---------- Authentication Dependencies ----------
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    """
    Decode JWT token, extract user_id, and fetch the corresponding User from DB.
    Raises 401 if token invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a JWT access token with expiration.
    Default expiry = 15 minutes (overridden by global setting).
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ============================================================
# HEALTH CHECK (新增)
# ============================================================

@app.get("/health")
async def health_check():
    """Service health check endpoint."""
    return {"status": "ok", "service": "linkspace", "version": "2.0.0"}


# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user.
    Checks if email or username already exists, then creates User record.
    Password is not hashed in this example (should be hashed in real implementation).
    """
    existing = await db.execute(select(User).where((User.email == user_in.email) | (User.username == user_in.username)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already registered")
    user = User(
        email=user_in.email, username=user_in.username,
        display_name=user_in.display_name,
        wallet_address=user_in.wallet_address, avatar_url=user_in.avatar_url,
        password_hash=pwd_context.hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@app.post("/auth/login", response_model=Token)
async def login(login_req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user by email and return a JWT token.
    NOTE: This example does not verify password hash – only checks email exists.
    In production, verify using pwd_context.verify(login_req.password, user.hashed_password).
    """
    result = await db.execute(select(User).where(User.email == login_req.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not pwd_context.verify(login_req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer", "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60}


# ============================================================
# USER ENDPOINTS
# ============================================================

@app.get("/users/me", response_model=UserResponse)
async def read_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's own profile."""
    return current_user

@app.get("/users/{user_id}/profile", response_model=UserProfile)
async def get_profile(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Get a user's public profile with aggregated statistics:
    - total game sessions
    - highest score
    - number of clubs joined
    - number of vision training sessions
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    sessions_count = await db.execute(select(func.count(GameSession.id)).where(GameSession.user_id == user_id))
    best_score = await db.execute(select(func.max(GameSession.score)).where(GameSession.user_id == user_id))
    clubs_count = await db.execute(select(func.count(ClubMember.id)).where(ClubMember.user_id == user_id))
    vision_count = await db.execute(select(func.count(VisionSession.id)).where(VisionSession.user_id == user_id))
    return UserProfile(
        id=user.id, username=user.username, display_name=user.display_name,
        avatar_url=user.avatar_url, level=user.level, xp=user.xp,
        sport_tokens=user.sport_tokens,
        total_sessions=sessions_count.scalar() or 0,
        best_score=best_score.scalar() or 0,
        club_count=clubs_count.scalar() or 0,
        vision_sessions=vision_count.scalar() or 0,
    )


# ============================================================
# GAME MODES & SESSIONS
# ============================================================

@app.get("/games/modes", response_model=List[GameModeResponse])
async def list_game_modes(db: AsyncSession = Depends(get_db)):
    """List all active game modes (is_active == True)."""
    result = await db.execute(select(GameMode).where(GameMode.is_active == True))
    return result.scalars().all()

@app.post("/games/sessions", response_model=GameSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_in: GameSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Record a completed game session.
    Also grants XP to user based on score and combos, and may level up.
    """
    mode = await db.get(GameMode, session_in.game_mode_id)
    if not mode:
        raise HTTPException(status_code=404, detail="Game mode not found")
    session = GameSession(
        user_id=current_user.id, game_mode_id=session_in.game_mode_id,
        score=session_in.score, combo_max=session_in.combo_max,
        accuracy=session_in.accuracy, duration_seconds=session_in.duration_seconds,
        metadata=session_in.metadata or {}
    )
    db.add(session)
    # XP calculation: score/10 + combo*5
    xp_gain = session_in.score // 10 + session_in.combo_max * 5
    current_user.xp += xp_gain
    # Level up if XP exceeds threshold (level * 1000)
    if current_user.xp >= current_user.level * 1000:
        current_user.level += 1
    await db.commit()
    await db.refresh(session)
    return session

@app.get("/games/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    game_mode_id: Optional[UUID] = None,
    period: str = Query("weekly", regex="^(daily|weekly|monthly|all_time)$"),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a leaderboard based on best scores.
    Can filter by game mode and time period.
    Returns top N users with their best score and best combo.
    """
    query = select(
        User.id, User.username, User.display_name, User.avatar_url,
        func.max(GameSession.score).label("best_score"),
        func.max(GameSession.combo_max).label("best_combo")
    ).join(GameSession, User.id == GameSession.user_id)
    if game_mode_id:
        query = query.where(GameSession.game_mode_id == game_mode_id)
    if period == "daily":
        query = query.where(GameSession.created_at >= datetime.utcnow() - timedelta(days=1))
    elif period == "weekly":
        query = query.where(GameSession.created_at >= datetime.utcnow() - timedelta(weeks=1))
    elif period == "monthly":
        query = query.where(GameSession.created_at >= datetime.utcnow() - timedelta(days=30))
    # Group by user and order by highest score descending
    query = query.group_by(User.id).order_by(desc("best_score")).limit(limit)
    result = await db.execute(query)
    rows = result.all()
    entries = [
        LeaderboardEntry(
            rank=i+1, user_id=row.id, username=row.username,
            display_name=row.display_name, avatar_url=row.avatar_url,
            score=row.best_score, best_combo=row.best_combo
        ) for i, row in enumerate(rows)
    ]
    return LeaderboardResponse(
        game_mode_id=game_mode_id, period=period,
        entries=entries, computed_at=datetime.utcnow()
    )


# ============================================================
# VISION TRAINING SESSIONS (REST)
# ============================================================

@app.post("/vision/sessions", response_model=VisionSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_vision_session(
    session_in: VisionSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a vision training session record after a training round.
    Grants XP based on similarity and combo.
    """
    mode = await db.get(GameMode, session_in.game_mode_id)
    if not mode:
        raise HTTPException(status_code=404, detail="Game mode not found")
    session = VisionSession(
        user_id=current_user.id, game_mode_id=session_in.game_mode_id,
        reference_video_url=session_in.reference_video_url,
        average_similarity=session_in.average_similarity,
        best_combo=session_in.best_combo, total_frames=session_in.total_frames,
        good_frame_pct=session_in.good_frame_pct,
        joint_deviations=session_in.joint_deviations or {},
        metadata=session_in.metadata or {}
    )
    db.add(session)
    # XP bonus: similarity*2 + best_combo*3 (similarity is a percentage)
    xp_gain = int(float(session_in.average_similarity) * 2) + session_in.best_combo * 3
    current_user.xp += xp_gain
    if current_user.xp >= current_user.level * 1000:
        current_user.level += 1
    await db.commit()
    await db.refresh(session)
    return session

@app.get("/vision/sessions", response_model=List[VisionSessionResponse])
async def list_vision_sessions(
    current_user: User = Depends(get_current_user),
    game_mode_id: Optional[UUID] = None,
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List the current user's vision sessions, filtered by game mode optionally."""
    query = select(VisionSession).where(VisionSession.user_id == current_user.id).order_by(desc(VisionSession.created_at))
    if game_mode_id:
        query = query.where(VisionSession.game_mode_id == game_mode_id)
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/vision/sessions/{session_id}", response_model=VisionSessionResponse)
async def get_vision_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific vision session (ensures ownership)."""
    session = await db.get(VisionSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ============================================================
# CLUBS
# ============================================================

@app.post("/clubs", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def create_club(
    club_in: ClubCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new club. The creator becomes the owner and an admin member.
    Slug must be unique.
    """
    existing = await db.execute(select(Club).where(Club.slug == club_in.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already taken")
    club = Club(
        name=club_in.name, slug=club_in.slug,
        description=club_in.description, owner_id=current_user.id, member_count=1
    )
    db.add(club)
    await db.flush()   # to get club.id before committing
    # Add creator as admin member
    member = ClubMember(club_id=club.id, user_id=current_user.id, role="admin")
    db.add(member)
    await db.commit()
    await db.refresh(club)
    return club

@app.get("/clubs", response_model=List[ClubResponse])
async def list_clubs(
    search: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List clubs, ordered by member count descending. Supports name search."""
    query = select(Club).order_by(desc(Club.member_count))
    if search:
        query = query.where(Club.name.ilike(f"%{search}%"))
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/clubs/{club_id}", response_model=ClubResponse)
async def get_club(club_id: UUID, db: AsyncSession = Depends(get_db)):
    """Fetch a single club by ID."""
    club = await db.get(Club, club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club

@app.post("/clubs/{club_id}/join", response_model=ClubMemberResponse)
async def join_club(
    club_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Join a club. Adds a ClubMember record and increments member_count.
    Prevents duplicate membership.
    """
    club = await db.get(Club, club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    existing = await db.execute(
        select(ClubMember).where(ClubMember.club_id == club_id, ClubMember.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member")
    member = ClubMember(club_id=club_id, user_id=current_user.id)
    db.add(member)
    club.member_count += 1   # denormalised count
    await db.commit()
    await db.refresh(member)
    return member


# ============================================================
# EVENTS
# ============================================================

@app.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: EventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create an event; automatically sets status='upcoming' and created_by."""
    event = Event(**event_in.dict(), created_by=current_user.id, status="upcoming")
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

@app.get("/events", response_model=List[EventResponse])
async def list_events(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List events, optionally filtered by status and/or type."""
    query = select(Event).order_by(Event.start_at)
    if status:
        query = query.where(Event.status == status)
    if event_type:
        query = query.where(Event.event_type == event_type)
    result = await db.execute(query)
    return result.scalars().all()

@app.post("/events/{event_id}/register")
async def register_for_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Register a user for an event. Only allowed if event status is 'upcoming'.
    Prevents duplicate registration.
    """
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "upcoming":
        raise HTTPException(status_code=400, detail="Registration closed")
    existing = await db.execute(
        select(EventParticipant).where(EventParticipant.event_id == event_id, EventParticipant.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already registered")
    participant = EventParticipant(event_id=event_id, user_id=current_user.id)
    db.add(participant)
    await db.commit()
    return {"message": "Registered successfully"}


# ============================================================
# DAILY RECORDS
# ============================================================

@app.post("/records", response_model=DailyRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    record_in: DailyRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a daily record entry (health/activity metric)."""
    record = DailyRecord(user_id=current_user.id, **record_in.dict())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record

@app.get("/records", response_model=List[DailyRecordResponse])
async def list_records(
    current_user: User = Depends(get_current_user),
    record_type: Optional[str] = None,
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List current user's records, optionally filtered by type."""
    query = select(DailyRecord).where(DailyRecord.user_id == current_user.id).order_by(desc(DailyRecord.recorded_at))
    if record_type:
        query = query.where(DailyRecord.record_type == record_type)
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


# ============================================================
# THEME COLLECTIONS
# ============================================================

@app.get("/themes", response_model=List[ThemeCollectionResponse])
async def list_themes(
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """List theme collections, optionally filtering by active status."""
    query = select(ThemeCollection).order_by(desc(ThemeCollection.created_at))
    if is_active is not None:
        query = query.where(ThemeCollection.is_active == is_active)
    result = await db.execute(query)
    return result.scalars().all()


# ============================================================
# VISION WEBSOCKET (REAL‑TIME POSE STREAMING)
# ============================================================

class VisionConnectionManager:
    """
    Manages active WebSocket connections for vision training.
    Stores each client's WebSocket and optional session state.
    """
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Vision client {client_id} connected. Total: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.sessions:
            del self.sessions[client_id]
        logger.info(f"Vision client {client_id} disconnected.")

    async def send_json(self, client_id: str, data: dict):
        """Send a JSON message to a specific client safely."""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(data)
            except Exception as e:
                logger.error(f"Send error to {client_id}: {e}")

vision_manager = VisionConnectionManager()


@app.websocket("/ws/vision/{client_id}")
async def vision_websocket(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real‑time pose estimation and similarity scoring.
    Expects binary messages (JPEG/PNG frames) and text commands.
    Sends back JSON with scores, joint deviations, feedback, and annotated frame (base64).
    """
    await vision_manager.connect(websocket, client_id)
    estimator = get_pose_estimator()
    engine = PoseSimilarityEngine()
    matcher = RealtimePoseMatcher(engine, target_fps=10.0)
    session_active = False
    auto_reference = False
    frame_count = 0
    processing_times = []

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            # Handle text messages (commands)
            if message.get("type") == "websocket.receive":
                if "text" in message and message["text"]:
                    try:
                        data = json.loads(message["text"])
                    except json.JSONDecodeError:
                        await vision_manager.send_json(client_id, {"type": "error", "message": "Invalid JSON"})
                        continue
                    cmd = data.get("command")
                    if cmd == "start":
                        # Start a new vision session: load reference sequence if provided
                        game_mode = data.get("game_mode", "poomsae")
                        ref_sequence = data.get("reference_sequence", [])
                        if ref_sequence:
                            frames = []
                            for f in ref_sequence:
                                lms = [Landmark3D(**lm) for lm in f.get("landmarks", [])]
                                frames.append(PoseFrame(
                                    timestamp=f.get("timestamp", 0),
                                    landmarks=lms,
                                    image_shape=tuple(f.get("image_shape", [480, 640])),
                                ))
                            engine.load_reference(frames)
                            auto_reference = False
                        else:
                            auto_reference = True
                        matcher.reset()
                        session_active = True
                        frame_count = 0
                        processing_times = []
                        await vision_manager.send_json(client_id, {
                            "type": "session_started",
                            "game_mode": game_mode,
                            "reference_frames": len(engine.reference_sequence),
                            "timestamp": time.time(),
                        })
                    elif cmd == "stop":
                        # End session and send summary
                        session_active = False
                        summary = matcher.get_session_summary()
                        avg_proc = np.mean(processing_times) if processing_times else 0
                        await vision_manager.send_json(client_id, {
                            "type": "session_ended",
                            "summary": summary,
                            "stats": {
                                "total_frames": frame_count,
                                "avg_processing_ms": round(avg_proc * 1000, 2),
                            },
                            "timestamp": time.time(),
                        })
                    elif cmd == "ping":
                        await vision_manager.send_json(client_id, {"type": "pong", "timestamp": time.time()})

                # Handle binary messages (image frames)
                elif "bytes" in message and message["bytes"]:
                    if not session_active:
                        matcher.reset()
                        session_active = True
                        auto_reference = True
                    t0 = time.time()
                    frame_count += 1
                    nparr = np.frombuffer(message["bytes"], np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if frame is None:
                        await vision_manager.send_json(client_id, {
                            "type": "frame_result", "frame_id": frame_count,
                            "error": "Failed to decode frame",
                        })
                        continue
                    # Process pose
                    pose = estimator.process_frame(frame)
                    if pose is not None and auto_reference and not engine.reference_sequence:
                        engine.load_reference([pose])
                    if pose is None:
                        # No person detected – send annotated frame with "No person detected"
                        annotated = frame.copy()
                        cv2.putText(annotated, "No person detected", (20, 40),
                                   cv2.FONT_HERSHEY_SIMPLEX, 1, (140, 21, 21), 2, cv2.LINE_AA)
                        await vision_manager.send_json(client_id, {
                            "type": "frame_result", "frame_id": frame_count,
                            "person_detected": False,
                            "annotated_frame": encode_frame_to_base64(annotated, quality=70),
                            "timestamp": time.time(),
                        })
                        continue
                    # Compute similarity with reference
                    result = matcher.process_frame(pose)
                    # Annotate frame with skeleton and deviations
                    annotated = estimator.draw_skeleton(frame, pose)
                    if result.joint_deviations:
                        annotated = estimator.draw_deviation_overlay(annotated, pose, result.joint_deviations)
                    # Draw HUD (score, quality, combo, feedback)
                    _draw_hud_on_frame(annotated, result, matcher)
                    # Encode annotated frame to base64
                    encoded = encode_frame_to_base64(annotated, quality=75)
                    proc_time = time.time() - t0
                    processing_times.append(proc_time)
                    # Send result
                    await vision_manager.send_json(client_id, {
                        "type": "frame_result", "frame_id": frame_count,
                        "person_detected": True,
                        "similarity_score": round(result.overall_score, 1),
                        "quality": result.quality.value,
                        "combo": matcher.combo_count,
                        "best_combo": matcher.best_combo,
                        "reference_progress": round(matcher.get_session_summary().get("reference_progress", 0), 1),
                        "per_joint_scores": {k: round(v, 1) for k, v in result.per_joint_scores.items()},
                        "joint_deviations": {k: round(v, 1) for k, v in result.joint_deviations.items()},
                        "feedback": result.feedback,
                        "annotated_frame": encoded,
                        "processing_ms": round(proc_time * 1000, 1),
                        "timestamp": time.time(),
                    })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Vision WebSocket error for {client_id}: {e}")
    finally:
        vision_manager.disconnect(client_id)


def _draw_hud_on_frame(image: np.ndarray, result: SimilarityResult, matcher: RealtimePoseMatcher):
    """
    Draw Heads-Up Display overlay on the annotated frame:
    - Score percentage (color-coded: green ≥80, yellow ≥60, red <60)
    - Quality label (GOOD/FAIR/POOR)
    - Combo count (if >1)
    - First feedback message (if any)
    """
    h, w = image.shape[:2]
    score = result.overall_score
    # Color coding based on score
    color = (23, 94, 84) if score >= 80 else ((0, 165, 255) if score >= 60 else (140, 21, 21))
    overlay = image.copy()
    # Semi-transparent background for score panel
    cv2.rectangle(overlay, (w - 200, 10), (w - 10, 100), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, image, 0.4, 0, image)
    cv2.putText(image, f"{score:.0f}%", (w - 190, 55),
               cv2.FONT_HERSHEY_SIMPLEX, 1.4, color, 3, cv2.LINE_AA)
    cv2.putText(image, result.quality.value.upper(), (w - 190, 85),
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1, cv2.LINE_AA)
    # Combo display (only if >1)
    if matcher.combo_count > 1:
        cv2.putText(image, f"COMBO x{matcher.combo_count}", (20, 55),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.2, (23, 94, 84), 3, cv2.LINE_AA)
    # First feedback message at bottom
    if result.feedback:
        fb = result.feedback[0]
        (tw, th), _ = cv2.getTextSize(fb, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.rectangle(image, (15, h - 40), (25 + tw, h - 15), (0, 0, 0), -1)
        cv2.putText(image, fb, (20, h - 22),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)


# ============================================================
# VISION REST ENDPOINTS (single‑frame analysis, reference extraction)
# ============================================================

@app.post("/vision/analyze-frame")
async def analyze_single_frame(
    frame_b64: str,
    reference_sequence: Optional[List[dict]] = None,
):
    """
    Analyze a single image (base64) for pose.
    Optionally compare against a reference sequence and return similarity scores.
    Useful for testing or non‑real‑time analysis.
    """
    estimator = get_pose_estimator()
    try:
        img_data = base64.b64decode(frame_b64.split(",")[-1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    pose = estimator.process_frame(frame)
    if pose is None:
        return {"person_detected": False, "message": "No person detected in frame"}
    # Compute joint angles for basic analysis
    from pose_similarity import JointAngleCalculator
    angles = JointAngleCalculator.compute_all_angles(pose)
    result = {
        "person_detected": True,
        "landmarks": [
            {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
            for lm in pose.landmarks
        ],
        "joint_angles": {k: round(v, 2) for k, v in angles.items()},
        "image_shape": pose.image_shape,
    }
    # If reference provided, compute similarity
    if reference_sequence:
        engine = PoseSimilarityEngine()
        frames = []
        for f in reference_sequence:
            lms = [Landmark3D(**lm) for lm in f.get("landmarks", [])]
            frames.append(PoseFrame(
                timestamp=f.get("timestamp", 0),
                landmarks=lms,
                image_shape=tuple(f.get("image_shape", [480, 640])),
            ))
        engine.load_reference(frames)
        sim_result = engine.compute_live_frame(pose)
        result["similarity"] = {
            "overall_score": round(sim_result.overall_score, 1),
            "quality": sim_result.quality.value,
            "per_joint_scores": {k: round(v, 1) for k, v in sim_result.per_joint_scores.items()},
            "joint_deviations": {k: round(v, 1) for k, v in sim_result.joint_deviations.items()},
            "feedback": sim_result.feedback,
        }
    return result


@app.post("/vision/extract-reference")
async def extract_reference_from_video(
    video_url: str,
    sample_fps: float = 10.0,
    max_duration: float = 30.0,
):
    """
    Download a video from a URL, extract pose frames at a given sample rate,
    and return a sequence of landmarks suitable for use as reference in training.
    """
    estimator = get_pose_estimator()
    import urllib.request
    import tempfile
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            urllib.request.urlretrieve(video_url, tmp.name)
            video_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download video: {e}")
    from vision_service import VideoPoseExtractor
    extractor = VideoPoseExtractor(estimator)
    try:
        sequence = extractor.extract_sequence(video_path, sample_fps=sample_fps, max_duration_seconds=max_duration)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")
    return {
        "frame_count": len(sequence),
        "sample_fps": sample_fps,
        "sequence": [
            {
                "timestamp": f.timestamp,
                "landmarks": [
                    {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                    for lm in f.landmarks
                ],
                "image_shape": f.image_shape,
            }
            for f in sequence
        ],
    }

