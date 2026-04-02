-- StarkTrade AI — PostgreSQL 16 + TimescaleDB Schema
-- Run: CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'free', 'pro', 'enterprise');
CREATE TYPE trade_side AS ENUM ('buy', 'sell');
CREATE TYPE trade_status AS ENUM ('pending', 'approved', 'executed', 'cancelled', 'rejected', 'failed');
CREATE TYPE asset_class AS ENUM ('stock', 'etf', 'option', 'crypto', 'forex');
CREATE TYPE agent_status AS ENUM ('idle', 'analyzing', 'voting', 'error');
CREATE TYPE market_status AS ENUM ('open', 'closed', 'resolved', 'cancelled');
CREATE TYPE position_type AS ENUM ('long', 'short');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE notification_type AS ENUM ('trade_executed', 'signal_generated', 'risk_alert', 'daily_digest', 'agent_update');
CREATE TYPE strategy_type AS ENUM ('value', 'quant', 'momentum', 'all_weather', 'aggressive', 'conservative');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    two_factor_secret VARCHAR(255),
    risk_tolerance INTEGER NOT NULL DEFAULT 5 CHECK (risk_tolerance BETWEEN 1 AND 10),
    strategy strategy_type NOT NULL DEFAULT 'all_weather',
    position_sizing VARCHAR(50) NOT NULL DEFAULT 'kelly',
    max_drawdown_pct NUMERIC(5,2) NOT NULL DEFAULT 8.00,
    daily_loss_limit_pct NUMERIC(5,2) NOT NULL DEFAULT 3.00,
    auto_trading_enabled BOOLEAN NOT NULL DEFAULT false,
    paper_trading_balance NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
    broker_alpaca_key VARCHAR(255),
    broker_alpaca_secret VARCHAR(255),
    broker_ibkr_config JSONB,
    broker_coinbase_key VARCHAR(255),
    broker_binance_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- PORTFOLIOS
-- ============================================================
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default Portfolio',
    total_value NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    cash_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    daily_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_return_pct NUMERIC(8,4) NOT NULL DEFAULT 0.0000,
    sharpe_ratio NUMERIC(8,4),
    max_drawdown_pct NUMERIC(8,4),
    beta NUMERIC(8,4),
    win_rate NUMERIC(5,2),
    is_paper BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user ON portfolios(user_id);

-- ============================================================
-- POSITIONS
-- ============================================================
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    asset_class asset_class NOT NULL,
    position_type position_type NOT NULL DEFAULT 'long',
    quantity NUMERIC(15,8) NOT NULL,
    avg_entry_price NUMERIC(15,8) NOT NULL,
    current_price NUMERIC(15,8),
    unrealized_pnl NUMERIC(15,2),
    unrealized_pnl_pct NUMERIC(8,4),
    sector VARCHAR(100),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_positions_portfolio ON positions(portfolio_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);

-- ============================================================
-- TRADES
-- ============================================================
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    agent_decision_id UUID,
    symbol VARCHAR(50) NOT NULL,
    asset_class asset_class NOT NULL,
    side trade_side NOT NULL,
    quantity NUMERIC(15,8) NOT NULL,
    entry_price NUMERIC(15,8),
    exit_price NUMERIC(15,8),
    stop_loss NUMERIC(15,8),
    take_profit NUMERIC(15,8),
    status trade_status NOT NULL DEFAULT 'pending',
    risk_score INTEGER CHECK (risk_score BETWEEN 1 AND 100),
    conviction_score INTEGER CHECK (conviction_score BETWEEN 1 AND 10),
    pnl NUMERIC(15,2),
    pnl_pct NUMERIC(8,4),
    fees NUMERIC(10,4) DEFAULT 0,
    reasoning TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_portfolio ON trades(portfolio_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created ON trades(created_at DESC);

-- ============================================================
-- AGENTS
-- ============================================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    persona VARCHAR(100) NOT NULL,
    description TEXT,
    status agent_status NOT NULL DEFAULT 'idle',
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    total_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    avg_confidence NUMERIC(5,2),
    performance_score NUMERIC(5,2),
    current_task TEXT,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);

-- Pre-populate agents
INSERT INTO agents (name, persona, description) VALUES
('The Researcher', '🕵️ Bloomberg Terminal', 'Web scraper, news, sentiment, SEC filings, economic calendar, on-chain analytics'),
('The Strategist', '🧠 Munger/Buffett Brain', 'Patient, contrarian, value-focused. Intrinsic value, margin of safety, moat analysis'),
('The Quant', '📊 Jim Simons Precision', 'Statistical arbitrage, mean reversion, ML patterns, backtesting, alternative data'),
('The Risk Manager', '🛡️ Dalio Shield', 'Final gatekeeper. Position sizing, drawdown limits, stress testing, portfolio risk'),
('The Organizer', '📋 Efficient PM', 'Workflow management, task queuing, notifications, daily digests'),
('The Learner', '🎓 Reflective Self-Improver', 'Trade review, pattern identification, agent weight adjustment, lessons reports'),
('The Fundamentalist', '🔍 Forensic Accountant', '10-K analysis, revenue CAGR, FCF yield, D/E ratio, insider activity, moat scoring');

-- ============================================================
-- AGENT DECISIONS
-- ============================================================
CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
    decision_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(50),
    reasoning TEXT NOT NULL,
    confidence NUMERIC(5,2) NOT NULL,
    vote VARCHAR(20) CHECK (vote IN ('approve', 'reject', 'modify', 'abstain')),
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decisions_agent ON agent_decisions(agent_id);
CREATE INDEX idx_decisions_trade ON agent_decisions(trade_id);
CREATE INDEX idx_decisions_created ON agent_decisions(created_at DESC);

-- ============================================================
-- AGENT LOGS
-- ============================================================
CREATE TABLE agent_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('agent_logs', 'created_at');

CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_id, created_at DESC);

-- ============================================================
-- PREDICTION MARKETS
-- ============================================================
CREATE TABLE prediction_markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    resolution_source VARCHAR(255),
    yes_price NUMERIC(10,4) NOT NULL DEFAULT 0.5000,
    no_price NUMERIC(10,4) NOT NULL DEFAULT 0.5000,
    yes_pool NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    no_pool NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_volume NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status market_status NOT NULL DEFAULT 'open',
    resolution VARCHAR(10) CHECK (resolution IN ('yes', 'no', 'void')),
    closes_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_markets_status ON prediction_markets(status);
CREATE INDEX idx_markets_category ON prediction_markets(category);
CREATE INDEX idx_markets_closes ON prediction_markets(closes_at);

-- ============================================================
-- PREDICTION POSITIONS
-- ============================================================
CREATE TABLE prediction_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL CHECK (side IN ('yes', 'no')),
    quantity NUMERIC(15,4) NOT NULL,
    avg_price NUMERIC(10,4) NOT NULL,
    current_price NUMERIC(10,4),
    pnl NUMERIC(15,2) DEFAULT 0,
    settled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pred_positions_user ON prediction_positions(user_id);
CREATE INDEX idx_pred_positions_market ON prediction_positions(market_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- ============================================================
-- RISK EVENTS
-- ============================================================
CREATE TABLE risk_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    level risk_level NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    action_taken VARCHAR(255),
    auto_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_events_user ON risk_events(user_id, created_at DESC);
CREATE INDEX idx_risk_events_level ON risk_events(level);

-- ============================================================
-- LEARNING REPORTS
-- ============================================================
CREATE TABLE learning_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    total_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    best_trade JSONB,
    worst_trade JSONB,
    lessons TEXT,
    agent_adjustments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_user ON learning_reports(user_id, period_end DESC);

-- ============================================================
-- MARKET DATA (TimescaleDB hypertable)
-- ============================================================
CREATE TABLE ohlcv_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open NUMERIC(15,8) NOT NULL,
    high NUMERIC(15,8) NOT NULL,
    low NUMERIC(15,8) NOT NULL,
    close NUMERIC(15,8) NOT NULL,
    volume NUMERIC(20,4) NOT NULL
);

SELECT create_hypertable('ohlcv_data', 'time');

CREATE INDEX idx_ohlcv_symbol ON ohlcv_data(symbol, time DESC);

-- ============================================================
-- ALTERNATIVE DATA
-- ============================================================
CREATE TABLE alternative_data (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    source VARCHAR(100) NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    symbol VARCHAR(50),
    payload JSONB NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alt_data_source ON alternative_data(source, collected_at DESC);
CREATE INDEX idx_alt_data_symbol ON alternative_data(symbol) WHERE symbol IS NOT NULL;

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('audit_log', 'created_at');

CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_portfolios_updated BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_positions_updated BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_markets_updated BEFORE UPDATE ON prediction_markets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pred_positions_updated BEFORE UPDATE ON prediction_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SITE CONFIG (ad slots, feature flags, managed by admins)
-- ============================================================
CREATE TABLE site_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEFAULT ADMIN SEED
-- Replace 'YOUR_HASHED_PASSWORD' with output of:
-- python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('YOUR_PASSWORD'))"
-- ============================================================
-- INSERT INTO users (email, hashed_password, full_name, role, is_active, is_verified)
-- VALUES ('admin@starktrade.ai', 'YOUR_HASHED_PASSWORD', 'Admin', 'admin', true, true);

-- ============================================================
-- DEFAULT SITE CONFIG (AdSense placeholders)
-- ============================================================
INSERT INTO site_config (key, value, description) VALUES
('adsense_client_id', '', 'Google AdSense publisher ID (e.g., ca-pub-XXXXXXXXXXXXXXXX)'),
('adsense_slot_landing', '', 'Ad slot ID for landing page banner'),
('adsense_slot_dashboard', '', 'Ad slot ID for dashboard sidebar'),
('adsense_slot_predictions', '', 'Ad slot ID for predictions page'),
('site_name', 'StarkTrade AI', 'Site display name'),
('maintenance_mode', 'false', 'Enable maintenance mode');
