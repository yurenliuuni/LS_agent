-- LinkSpace Database Schema
-- PostgreSQL 15+
-- 10 tables 

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- 提供產生 UUID （Universal Unique Identifier）的function 因為要存UUID，UUID是用來確保資料的唯一性，以及方便後續的資料庫操作，尤其是當資料庫需要進行資料遷移時，UUID可以避免資料重複的問題。例如我們在資料庫中新增了一個欄位，但是資料庫中已經有了一筆資料，這時候我們就可以使用UUID來避免資料重複的問題。
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- 提供加密功能的extension，因為要存一些敏感資料，如密碼、信用卡號碼、社會安全碼等，這些資料需要加密後再存入資料庫，這樣可以避免密碼被他人竊取。

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),--主鍵(primary key)是用來identify the row of the table, 利用UUID   
    email VARCHAR(255) UNIQUE NOT NULL, --唯一且非空
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    avatar_url TEXT, --頭貼圖片url
    wallet_address VARCHAR(42) UNIQUE, -- 、錢包地址（42 字元，適合以太坊地址）

    role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'admin', 'coach')), --角色(player:玩家, admin:管理員, coach:教練) 
     -- 語法： 在 PostgreSQL 中，雙引號 " 是用來標示「識別符（Identifier）」（如資料表名稱、欄位名稱），不是字串值。
    level INTEGER DEFAULT 1, -- 等級（預設 1）、經驗值（預設 0）、平台代幣（20 位整數，8 位小數）
    xp INTEGER DEFAULT 0,
    sport_tokens DECIMAL(20,8) DEFAULT 0, 
    created_at TIMESTAMP DEFAULT NOW(), -- 建立時間
    updated_at TIMESTAMP DEFAULT NOW() -- 更新時間
);

CREATE INDEX idx_users_wallet ON users(wallet_address)
WHERE wallet_address IS NOT NULL; --建立index 加速錢包尋找
CREATE INDEX idx_users_level ON users(level DESC); --將等級建立降冪idx 加速排行搜尋


-- Game Modes
CREATE TABLE game_modes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(30) UNIQUE NOT NULL, -- URL friendly identifier 是用來識別遊戲模式的唯一標識符，例如："soccer-1v1"、"basketball-5v5"、"tennis-doubles"等。 -- 活動標題，用來建立一個不能重複、不能為空且長度最多 100 個字元的代碼欄位 網路與網頁設計 (URL Slug) 網址結尾：指網址（URL）最後面、用來識別特定文章或頁面的精簡英文與橫線組合（例如 ://example.com 中的 what-is-slug）。
    name VARCHAR(100) NOT NULL, -- 遊戲模式名稱
    description TEXT, -- 描述
    category VARCHAR(20) CHECK (category IN ('virtual', 'physical')), -- 分類(virtual:虛擬, physical:實體)
    scoring_rules JSONB DEFAULT '{}', -- scoring_rules：JSONB 格式儲存計分規則（彈性結構）
    is_active BOOLEAN DEFAULT true, --軟刪除或上／下架開關。預設為啟用。
    created_at TIMESTAMP DEFAULT NOW()
);

--game_sessions  遊戲活動紀錄
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- associated with users and game mode, ON DELETE CASCADE 表示刪除使用者時一併刪除其會話
    game_mode_id UUID NOT NULL REFERENCES game_modes(id),
    score INTEGER DEFAULT 0,
    combo_max INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0, -- 準確率（小數 5 位含 2 位小數）
    duration_seconds INTEGER DEFAULT 0,
    replay_url TEXT, -- 重播影片網址
    session_metadata JSONB DEFAULT '{}', -- 、彈性中繼資料
    created_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx_sessions_user ON game_sessions(user_id, created_at DESC); -- 依照user id 搜尋最近使用的session
CREATE INDEX idx_sessions_game ON game_sessions(game_mode_id, score DESC); --依照遊戲模式查詢分數榜
CREATE INDEX idx_sessions_created ON game_sessions(created_at DESC); --依照所有時間查詢

-- clubs
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, --社團名稱
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    acatar_url TEXT,
    banner_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id), -- 擁有者（關聯使用者）
    member_count INTEGER DEFAULT 0, -- 成員數計數器
    is_verified BOOLEAN DEFAULT false, -- 是否官方認證
    created_at TIMESTAMPTZ DEFAULT NOW()

);

--club members 
CREATE TABLE club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')), -- 成員、版主、管理員
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(club_id, user_id) --UNIQUE(club_id, user_id) 確保同一使用者不會重複加入同一俱樂部
);

CREATE INDEX idx_club_members ON club_members(club_id, joined_at DESC); --依照加入時間排序成員

-- daily_records 
--記錄使用者的每日數據（如步數、卡路里、運動時長等）
--value 數值、unit 單位、備註、記錄時間
CREATE TABLE daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type VARCHAR(30) NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    note TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_user ON daily_records(user_id, recorded_at DESC); --查詢最近一次的紀錄


--events, event_participants
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL, 
    slug VARCHAR(100) UNIQUE NOT NULL, --代碼
    description TEXT,
    event_type VARCHAR(20) CHECK (event_type IN ('virtual', 'physical')), 
    game_mode_id UUID NOT NULL REFERENCES game_modes(id),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    venue VARCHAR(200), -- 場地
    max_participants INTEGER,
    ticket_price DECIMAL(10,2) DEFAULT 0,
    ticket_currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'live', 'complete', 'cancelled')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()

);
CREATE INDEX idx_events_status ON events(status, start_at);
CREATE INDEX idx_events_time ON events(start_at, end_at);

CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_tx_hash VARCHAR(66), --區塊鏈交易雜湊（如以太坊交易為 0x 開頭共 66 字元）。儲存此資料可驗證使用者是否真的買了 NFT 票券。
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id) -- 防止同一人重複報名同一活動。
);

-- 排行榜快照表 (leaderboard_snapshots)

CREATE TABLE leaderboard_snapshots(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_mode_id UUID NOT NULL REFERENCES game_modes(id), --可依game mode or club 進行篩選
    club_id UUID REFERENCES clubs(id),
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    rankings JSONB NOT NULL DEFAULT '[]', -- JSONB 儲存排名陣列（彈性結構）
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ -- 有效期限
);

CREATE INDEX idx_leaderboard_lookup ON leaderboard_snapshots(game_mode_id, club_id, period, computed_at DESC);


-- 主題收藏與 IP 聯名 (theme_collections), 季節性活動＋IP聯名活動
CREATE TABLE theme_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL, 
    ip_partner VARCHAR(100),
    season VARCHAR(20),
    start_date DATE,
    end_date DATE,
    assets JSONB DEFAULT '[]', --JSONB 儲存相關素材/資產列表, 用來存入相關的素材/資產列表, 例如：圖片、影片、音樂、文字等。 []代表空的array, 相比於NULL, 空array更明確表示沒有資料。
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

--視覺訓練對話筐
CREATE TABLE vision_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), --可以看到每個表格都有id這個欄位，這個欄位是用來唯一標識每個資料的。
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_mode_id UUID NOT NULL REFERENCES game_modes(id),
    reference_video_url TEXT,
    average_similarity DECIMAL(5,2) DEFAULT 0, -- decimal(5,2) 表示小數點後2位, 最大值為5位數（包含整數位與小數位）, 小數點後2位。
    best_combo INTEGER DEFAULT 0,
    total_frames INTEGER DEFAULT 0, -- 總幀數，good_frame_pct：良好幀率百分比
    good_frame_pct DECIMAL(5,2) DEFAULT 0, --之所以設定成最大五位數，是因為良好幀率百分比最大值為100%，所以最多五位數。
    joint_deviations JSONB DEFAULT '{}', -- JSONB 儲存關節偏差數據（彈性結構）, {} vs [] ，兩者都代表空值，{}是JSONB的空值，[]是array的空值。, JSONB 記錄各關節偏差值
    session_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()

);


CREATE INDEX idx_vision_user ON vision_sessions(user_id, created_at DESC); --查詢使用者歷史記錄
CREATE INDEX idx_vision_game ON vision_sessions(game_mode_id, average_similarity DESC); --查詢遊戲模式分數榜


--觸發器與自動更新函數 用來觸發->自動更新updated_at欄位為現在時間
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$   -- ← RETURNS（有 S）
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--在 users 表的每次 UPDATE 操作前自動執行該函數，確保 updated_at 自動刷新
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 

