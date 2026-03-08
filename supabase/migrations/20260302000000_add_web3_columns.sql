-- Add tx_hash column to reports for on-chain anchoring
ALTER TABLE reports ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- Add Web3 verification columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_web3 BOOLEAN DEFAULT FALSE;

-- Index for quick tx lookup
CREATE INDEX IF NOT EXISTS idx_reports_tx_hash ON reports(tx_hash) WHERE tx_hash IS NOT NULL;
