#定義 API request and response 的資料結構
# 使用Pydantic 進行資料驗證（Validation）與序列化（Serialization）。
# 主要目的包括：
    # 請求驗證：確保客戶端提交的資料（如建立使用者、建立遊戲會話）符合格式與型別要求。
    # 統一 API 回傳的 JSON 結構: 隱藏敏感欄位（如密碼），並將資料庫模型（ORM 物件）轉換為前端可用的格式。
    # Type safety 型別安全：利用 Python Type Hint 與 Pydantic 的 Field 設定約束（如最小長度、數值範圍），減少執行時期錯誤。在程式執行前或資料剛進API時，就先透過「規則與型別檢查」把不合法的資料擋下來，避免程式運作到一半才壞掉。


#這些 Schemas 對應到models.py的SQLAlchemy 模型中的各個資料表，可分為以下群組：
# 群組	Schemas	用途
# Users:	UserBase, UserCreate, UserResponse, UserProfile	註冊、登入、個人資料查詢與更新
# Gamemode:	GameModeBase, GameModeResponse	遊戲模式的建立與查詢
# GameSession: 	GameSessionCreate, GameSessionResponse, LeaderboardEntry, LeaderboardResponse	記錄遊戲結果、排行榜查詢
# VisionSession:	VisionSessionCreate, VisionSessionResponse, VisionFrameResult	儲存姿態偵測結果及逐幀分析
# Club:	ClubBase, ClubCreate, ClubResponse, ClubMemberResponse	俱樂部管理與成員資料
# Event:	EventBase, EventCreate, EventResponse	活動建立、查詢與參與資訊
# Daily Record: 	DailyRecordCreate, DailyRecordResponse	健康或運動數據上傳與查詢
# ThemeCollection:	ThemeCollectionResponse	主題套裝資訊
# 認證:	Token, LoginRequest, WalletAuthRequest	登入、錢包簽章驗證


# 每個 Schema 都繼承自 BaseModel，並使用 Config 子類別設定 from_attributes = True（舊版為 orm_mode = True），讓 Pydantic 能直接從 SQLAlchemy 模型實例讀取資料。
from datetime import datetime 
from typing import Optional,  List, Dict,Any
from pydantic import BaseModel, EmailStr, Field
from decimal import Decimal 
from uuid import UUID


# user schemas 

# Game dev (nintendo)
# Master (jeff dean)
# Startup investor (sam altman)

class UserBase(BaseModel):
    """Base user fields shared across create, update, and response schemas."""
    # Username: 3–50 characters, required
    username: str = Field(..., min_length = 3, max_length = 50)
    # Display name: optional, up to 100 chars
    display_name: Optional[str] = Field(None, max_length=100)
    # Email: validated as a proper email format
    email: EmailStr
    # Avatar URL: optional, stored as a string
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    """Request schema for user registration (includes password)."""
    # Password: minimum 8 characters (will be hashed before storage)
    password: str = Field(..., min_length=8)
    # Blockchain wallet address: optional, max 42 chars (e.g., Ethereum)
    wallet_address: Optional[str] = Field(None, max_length=42)

class UserResponse(UserBase):
    """Response schema for returning user data (excludes password)."""
    id: UUID
    role: str                      # 'player', 'admin', etc.
    level: int
    xp: int
    sport_tokens: Decimal          # token balance with full precision
    created_at: datetime
    class Config:
        from_attributes = True     # Enables ORM object to dict conversion, 讓 Pydantic 可以直接讀取「資料庫物件（ORM）」的資料，並轉成 JSON 給前端。


class UserProfile(BaseModel):
    """Rich user profile used for dashboard/statistics."""
    id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    level: int
    xp: int
    sport_tokens: Decimal
    # Aggregated stats (computed from related tables)
    total_sessions: int            # total game sessions played
    best_score: int                # highest score across all sessions
    club_count: int                # number of clubs joined
    vision_sessions: int           # total vision training sessions



#game mode schemas
class GameModeBase(BaseModel):
    """Base fields for a game mode."""
    slug: str                      # URL-friendly identifier
    name: str
    description: Optional[str] = None
    category: str                  # e.g., 'sports', 'puzzle'

class GameModeResponse(GameModeBase):
    """Full game mode data returned from API."""
    id: UUID
    scoring_rules: Dict[str, Any]  # JSON object with scoring logic
    is_active: bool                # soft delete/availability flag

    class Config:
        from_attributes = True


# GAME SESSION SCHEMAS
class GameSessionCreate(BaseModel):
    """Request body for creating a new game session."""
    game_mode_id: UUID
    # Score must be >= 0
    score: int = Field(..., ge=0)
    # Combo max non‑negative
    combo_max: int = Field(0, ge=0)
    # Accuracy between 0 and 100, with 2 decimal places
    accuracy: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    # Duration in seconds, must be >= 0
    duration_seconds: int = Field(..., ge=0)
    # Optional additional metadata (device info, opponents, etc.)
    metadata: Optional[Dict[str, Any]] = None

class GameSessionResponse(BaseModel):
    """Response schema for a completed game session."""
    id: UUID
    user_id: UUID
    game_mode: GameModeResponse    # Nested mode details
    score: int
    combo_max: int
    accuracy: Decimal
    duration_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True

class LeaderboardEntry(BaseModel):
    """Single entry in a leaderboard."""
    rank: int                      # Position (1‑based)
    user_id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    score: int
    best_combo: int                # Best combo achieved in that session

class LeaderboardResponse(BaseModel):
    """Full leaderboard response, optionally filtered by game mode or club."""
    game_mode_id: Optional[UUID]   # If None, global leaderboard
    club_id: Optional[UUID]        # If present, club‑scoped leaderboard
    period: str                    # e.g., 'daily', 'weekly', 'all‑time'
    entries: List[LeaderboardEntry]
    computed_at: datetime          # Timestamp when the leaderboard was generated


# VISION TRAINING SCHEMAS
class VisionSessionCreate(BaseModel):
    """Request data for creating a vision training session."""
    game_mode_id: UUID
    reference_video_url: Optional[str] = None
    # Average similarity score (0–100)
    average_similarity: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    best_combo: int = Field(0, ge=0)
    total_frames: int = Field(0, ge=0)
    # Percentage of frames with good pose match
    good_frame_pct: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    # Per‑joint deviation angles (e.g., {"shoulder": 5.2, "elbow": 3.1})
    joint_deviations: Optional[Dict[str, float]] = None
    metadata: Optional[Dict[str, Any]] = None

class VisionSessionResponse(BaseModel):
    """Full vision session data returned from API."""
    id: UUID
    user_id: UUID
    game_mode: GameModeResponse
    reference_video_url: Optional[str]
    average_similarity: Decimal
    best_combo: int
    total_frames: int
    good_frame_pct: Decimal
    joint_deviations: Dict[str, float]
    metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class VisionFrameResult(BaseModel):
    """Detailed analysis for a single video frame (used in real‑time feedback)."""
    frame_id: int
    similarity_score: float        # How well the pose matches the reference
    quality: str                   # e.g., 'good', 'fair', 'poor'
    combo: int                     # Current consecutive good frames
    best_combo: int                # Best combo so far in this session
    reference_progress: float      # Progress through reference movement (0–1)
    per_joint_scores: Dict[str, float]  # Individual joint similarity scores
    joint_deviations: Dict[str, float]  # Deviation angles per joint
    feedback: List[str]            # Textual suggestions for improvement
    processing_ms: float           # Time taken to process this frame


# Club Schema

class ClubBase(BaseModel):
    """Base club fields."""
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=50)   # URL identifier
    description: Optional[str] = None

class ClubCreate(ClubBase):
    """Request schema for creating a new club (no extra fields)."""
    pass

class ClubResponse(ClubBase):
    """Full club data returned from API."""
    id: UUID
    avatar_url: Optional[str]
    banner_url: Optional[str]
    owner_id: UUID                # User who created the club
    member_count: int             # Denormalised count
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ClubMemberResponse(BaseModel):
    """Membership details for a user in a club."""
    id: UUID
    user: UserResponse            # Nested user data
    role: str                     # 'member', 'captain', etc.
    joined_at: datetime

    class Config:
        from_attributes = True

# EVENT SCHEMAS
class EventBase(BaseModel):
    """Base event fields."""
    title: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = None
    event_type: str               # e.g., 'tournament', 'workshop'
    start_at: datetime
    end_at: datetime
    venue: Optional[str] = None
    max_participants: Optional[int] = None
    ticket_price: Decimal = Decimal("0.00")
    ticket_currency: str = "USD"  # ISO currency code

class EventCreate(EventBase):
    """Request for creating an event – optionally links to a game mode."""
    game_mode_id: Optional[UUID] = None

class EventResponse(EventBase):
    """Full event data returned from API."""
    id: UUID
    game_mode_id: Optional[UUID]
    status: str                   # 'upcoming', 'ongoing', 'ended', 'cancelled'
    created_by: UUID              # Organiser's user ID
    created_at: datetime
    participant_count: int = 0    # Number of registered users

    class Config:
        from_attributes = True


# Daily Record Schema 
class DailyRecordCreate(BaseModel):
    """Request to log a daily health/activity metric."""
    record_type: str = Field(..., max_length=30)  # 'steps', 'calories', etc.
    value: Decimal                # Numeric value (e.g., 5.25)
    unit: str = Field(..., max_length=20)         # 'km', 'kcal', 'steps'
    note: Optional[str] = None

class DailyRecordResponse(BaseModel):
    """Full daily record data."""
    id: UUID
    user_id: UUID
    record_type: str
    value: Decimal
    unit: str
    note: Optional[str]
    recorded_at: datetime         # When the measurement was taken

    class Config:
        from_attributes = True


# THEME COLLECTION SCHEMAS

class ThemeCollectionResponse(BaseModel):
    """Theme collection data (read‑only for now)."""
    id: UUID
    name: str
    slug: str
    ip_partner: Optional[str]      # Brand partner (e.g., 'Marvel')
    season: Optional[str]          # e.g., 'Spring 2026'
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    assets: List[Dict[str, Any]]   # List of asset objects (skins, backgrounds)
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# AUTHENTICATION SCHEMAS, 
# 這裡的內容不會對應到 models.py or schema.sql 因為model.py 是「資料庫的藍圖」（存放永久資料），而 schemas.py 這裡的這段是「API 的門票」（處理登入請求與回傳 Token）。
# 這三個類別（Token, LoginRequest, WalletAuthRequest）本來就不應該出現在 model.py 裡面，因為它們完全不會存進資料庫。
#schemas.py (Pydantic)：定義「API 進來的請求要長怎樣，出去的回應要長怎樣」。這只是暫時存在於網路傳輸中的資料，驗證完就丟掉，不儲存

class Token(BaseModel):
    """JWT token response after successful login.""" #通行證發放：JWT Token 是一個加密過的字串，伺服器通常將它存在記憶體（或 Redis）中做黑名單驗證，永遠不會存進 PostgreSQL 資料庫
    access_token: str
    token_type: str = "bearer"
    expires_in: int                # Lifetime in seconds

class LoginRequest(BaseModel): 
    """Email/password login request."""
    email: EmailStr
    password: str

class WalletAuthRequest(BaseModel):
    """Blockchain wallet authentication request (signature verification)."""
    wallet_address: str
    signature: str                 # Signed message from the wallet
    message: str                   # The plain text that was signed
