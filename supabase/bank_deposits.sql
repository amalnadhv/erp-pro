-- ============================================================
-- Bank Deposits Table
-- Run AFTER schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_no VARCHAR(30) UNIQUE,
  deposit_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  amount DECIMAL(14,2) DEFAULT 0,
  bank_account VARCHAR(255),
  bank_account_id UUID REFERENCES accounts(id),
  reference TEXT,
  deposit_type VARCHAR(30) DEFAULT 'Cash' CHECK (deposit_type IN ('Cash','Cheque','Transfer','PDC')),
  cheques JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Deposited','Cleared','Cancelled')),
  reconciled BOOLEAN DEFAULT false,
  reconciled_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-numbering
CREATE OR REPLACE FUNCTION set_deposit_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deposit_no IS NULL OR NEW.deposit_no = '' THEN
    NEW.deposit_no := 'DEP-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_deposit_no ON bank_deposits;
CREATE TRIGGER trg_set_deposit_no BEFORE INSERT ON bank_deposits FOR EACH ROW EXECUTE FUNCTION set_deposit_no();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_deposits_date ON bank_deposits(deposit_date);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_status ON bank_deposits(status);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_bank ON bank_deposits(bank_account);
