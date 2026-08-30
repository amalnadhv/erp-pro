-- ============================================================
-- BANK RECONCILIATION
-- Run this after journal.sql
-- =================================================== ==========

CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID REFERENCES accounts(id),
  statement_date  DATE NOT NULL,
  statement_balance  DECIMAL(14,2) NOT NULL,
  book_balance    DECIMAL(14,2) NOT NULL,
  difference      DECIMAL(14,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'Draft',
  notes           TEXT,
  created_by      VARCHAR(100),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_recon_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recon_id        UUID REFERENCES bank_reconciliation(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL,
  transaction_id   UUID,
  transaction_date DATE,
  description      TEXT,
  amount           DECIMAL(14,2) NOT NULL,
  statement_ind    BOOLEAN DEFAULT FALSE,
  book_ind         BOOLEAN DEFAULT FALSE,
  matched          BOOLEAN DEFAULT FALSE,
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_br_account ON bank_reconciliation(account_id);
CREATE INDEX IF NOT EXISTS idx_br_status ON bank_reconciliation(status);
CREATE INDEX IF NOT EXISTS idx_brl_recon ON bank_recon_lines(recon_id);

-- Trigger
CREATE OR REPLACE FUNCTION update_bank_recon_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bank_recon_updated ON bank_reconciliation;
CREATE TRIGGER bank_recon_updated
  BEFORE UPDATE ON bank_reconciliation
  FOR EACH ROW EXECUTE FUNCTION update_bank_recon_timestamp();
