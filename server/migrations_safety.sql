-- Guardian Sessions Table
CREATE TABLE IF NOT EXISTS guardian_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    guardian_name VARCHAR(255),
    token VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    expires_at TIMESTAMP,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Date Guards Table
CREATE TABLE IF NOT EXISTS date_guards (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    meeting_name VARCHAR(255),
    meeting_profile JSONB,
    duration_minutes INTEGER DEFAULT 120,
    contacts JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    contacts_notified BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    triggered_at TIMESTAMP,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) UNIQUE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_guardian_sessions_user ON guardian_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_sessions_token ON guardian_sessions(token);
CREATE INDEX IF NOT EXISTS idx_date_guards_user ON date_guards(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_sessions_status ON guardian_sessions(status);
CREATE INDEX IF NOT EXISTS idx_date_guards_status ON date_guards(status);
