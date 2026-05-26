-- ============================================================
-- 「学长说」V3 - 初始 Schema
-- 对应开发文档 §5
-- ============================================================

-- 启用 pgvector 扩展(Supabase 默认安装,但需要 enable)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============ 静态字典表 ============

CREATE TABLE IF NOT EXISTS schools (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  tier          INTEGER NOT NULL,             -- 1=C9, 2=985非C9, 3=211非985, 4=普一本, 5=二本及以下
  province      VARCHAR(20),
  is_985        BOOLEAN DEFAULT FALSE,
  is_211        BOOLEAN DEFAULT FALSE,
  is_c9         BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_schools_tier ON schools(tier);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools USING gin (to_tsvector('simple', name));

CREATE TABLE IF NOT EXISTS majors (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(50) NOT NULL          -- computer_science / business / engineering / ...
);
CREATE INDEX IF NOT EXISTS idx_majors_category ON majors(category);

CREATE TABLE IF NOT EXISTS companies (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  tier          INTEGER,                       -- 1=一线/行业顶部 2=头部/独角兽 3=普通 4=传统 5=国企央企 6=政府 7=创业
  industry      VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_companies_tier ON companies(tier);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

CREATE TABLE IF NOT EXISTS positions (
  id            SERIAL PRIMARY KEY,
  category      VARCHAR(50) NOT NULL,          -- engineer_backend / product_manager / ...
  name          VARCHAR(100)
);

-- ============ 用户 ============

CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone                   VARCHAR(20) UNIQUE NOT NULL,

  -- 背景
  school_id               INTEGER REFERENCES schools(id),
  school_tier             INTEGER,
  major_id                INTEGER REFERENCES majors(id),
  major_category          VARCHAR(50),
  education_level         VARCHAR(20),         -- 本科 / 硕士 / 博士
  graduation_year         INTEGER,
  gender                  VARCHAR(10),
  gpa_band                VARCHAR(10),         -- '<3.0' / '3.0-3.5' / '3.5+' / 'unknown'

  -- opt-in
  opt_in_consent          BOOLEAN DEFAULT FALSE,
  opt_in_at               TIMESTAMPTZ,

  -- 会员
  membership_tier         VARCHAR(20) DEFAULT 'free',   -- free / paid_basic / paid_pro
  membership_expires_at   TIMESTAMPTZ,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_school_major ON users(school_tier, major_category);

CREATE TABLE IF NOT EXISTS user_internships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id          INTEGER,
  position_category   VARCHAR(50),
  duration_months     INTEGER,
  start_date          DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_internships_user ON user_internships(user_id);

-- ============ 师兄师姐路径(核心数据)============

CREATE TABLE IF NOT EXISTS senior_paths (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 数据来源
  source                      VARCHAR(20) NOT NULL,    -- 'mock' / 'public' / 'zhilian'
  source_metadata             JSONB,

  -- 背景
  school_tier                 INTEGER NOT NULL,
  major_category              VARCHAR(50) NOT NULL,
  education_level             VARCHAR(20),
  gender                      VARCHAR(10),

  -- 第一段工作
  start_year                  INTEGER NOT NULL,
  first_company_id            INTEGER,
  first_company_tier          INTEGER,
  first_industry              VARCHAR(50),
  first_position_category     VARCHAR(50) NOT NULL,
  first_level                 VARCHAR(20) NOT NULL,    -- intern / graduate / junior / mid / senior

  -- 5 年后画像
  five_year_company_tier      INTEGER,
  five_year_industry          VARCHAR(50),
  five_year_level             VARCHAR(20),
  five_year_salary            INTEGER,                 -- 单位:元/年
  job_changes                 INTEGER DEFAULT 0,
  industry_changes            INTEGER DEFAULT 0,

  -- 中间路径
  path_history                JSONB,                   -- [{year, company_tier, industry, position, level}, ...]

  -- 向量(128 维,通义 text-embedding-v2 的维度可缩放,默认 1536,这里取 128 主成分)
  background_vec              VECTOR(128),

  -- 脱敏
  is_anonymized               BOOLEAN DEFAULT TRUE,
  k_anonymity                 INTEGER,                 -- 当前所属聚类的 k 值,< 1000 不能展示

  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_senior_first_offer
  ON senior_paths (first_company_id, first_position_category, first_level);
CREATE INDEX IF NOT EXISTS idx_senior_industry_year
  ON senior_paths (first_industry, start_year);
CREATE INDEX IF NOT EXISTS idx_senior_school_major
  ON senior_paths (school_tier, major_category);
CREATE INDEX IF NOT EXISTS idx_senior_k_anonymity
  ON senior_paths (k_anonymity);
-- pgvector ivfflat 索引(cosine)
CREATE INDEX IF NOT EXISTS idx_senior_vec
  ON senior_paths USING ivfflat (background_vec vector_cosine_ops)
  WITH (lists = 100);

-- ============ 用户 offer ============

CREATE TABLE IF NOT EXISTS user_offers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id          INTEGER,
  company_name        VARCHAR(100),
  position_category   VARCHAR(50) NOT NULL,
  position_name       VARCHAR(100),
  level               VARCHAR(20) NOT NULL,
  salary_min          INTEGER,
  salary_max          INTEGER,
  location            VARCHAR(50),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offers_user ON user_offers(user_id);

-- ============ 匹配结果 ============

CREATE TABLE IF NOT EXISTS matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  user_offer_id       UUID REFERENCES user_offers(id),

  matched_path_ids    UUID[] NOT NULL DEFAULT '{}',
  same_group_ids      UUID[] DEFAULT '{}',
  higher_group_ids    UUID[] DEFAULT '{}',
  lower_group_ids     UUID[] DEFAULT '{}',

  same_count          INTEGER DEFAULT 0,
  higher_count        INTEGER DEFAULT 0,
  lower_count         INTEGER DEFAULT 0,

  correction_data     JSONB,
  status              VARCHAR(20) DEFAULT 'computing', -- computing / completed / failed
  error_message       TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ============ 订单 ============

CREATE TABLE IF NOT EXISTS orders (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID REFERENCES users(id),

  product_type                VARCHAR(20) NOT NULL,  -- membership_annual / membership_monthly / single_unlock
  amount                      DECIMAL(10,2) NOT NULL,

  status                      VARCHAR(20) DEFAULT 'pending', -- pending / paid / refunded / cancelled
  payment_method              VARCHAR(20),
  payment_transaction_id      VARCHAR(100),

  paid_at                     TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);

-- ============ 环境校正因子(静态配置)============

CREATE TABLE IF NOT EXISTS environment_factors (
  id                  SERIAL PRIMARY KEY,
  factor_type         VARCHAR(30) NOT NULL,    -- industry_index / ai_risk / policy_event
  industry            VARCHAR(50),
  position_category   VARCHAR(50),
  year                INTEGER,
  value               DECIMAL(5,3),
  metadata            JSONB,
  notes               TEXT,

  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_env_factor_type ON environment_factors(factor_type);
CREATE INDEX IF NOT EXISTS idx_env_industry_year ON environment_factors(industry, year);

-- ============ updated_at 自动更新触发器 ============

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============ Row Level Security ============

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的数据
CREATE POLICY users_self_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_self_update ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY offers_self ON user_offers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY internships_self ON user_internships FOR ALL USING (auth.uid() = user_id);
CREATE POLICY matches_self ON matches FOR ALL USING (auth.uid() = user_id);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_self ON orders FOR SELECT USING (auth.uid() = user_id);

-- 字典与师兄路径公开可读
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE majors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_schools ON schools FOR SELECT USING (true);
CREATE POLICY public_read_majors  ON majors  FOR SELECT USING (true);
CREATE POLICY public_read_companies ON companies FOR SELECT USING (true);
CREATE POLICY public_read_positions ON positions FOR SELECT USING (true);
CREATE POLICY public_read_env ON environment_factors FOR SELECT USING (true);
-- 师兄路径:只允许通过 service role 写入,匿名/登录用户只能用 RPC 查询
CREATE POLICY senior_paths_read_anonymized ON senior_paths FOR SELECT
  USING (is_anonymized = true AND k_anonymity >= 1000);
