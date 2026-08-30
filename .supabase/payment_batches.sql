-- ============================================================
-- PAYMENT WIZARD: Payment Batches
-- Run this after banking.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name      VARCHAR(100) NOT NULL,
  payment_type    VARCHAR(20) NOT NULL CHECK (payment_type IN ('Incoming', 'Outgoing')),
  bank_account    VARCHAR(100),
  payment_method  VARCHAR(30),
  total_amount    DECIMAL(14,2) DEFAULT 0,
  payment_count   INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'Draft',
  created_by      VARCHAR(100),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID REFERENCES payment_batches(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL,
  transaction_id   UUID,
  description      TEXT,
  amount           DECIMAL(14,2) NOT NULL,
  currency         VARCHAR(10) DEFAULT 'AED',
  reference        VARCHAR(100),
  sequence         INTEGER,
  processed        BOOLEAN DEFAULT FALSE,
  processed_at     TIMESTAMP WITH TIME ZONE,
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_pb_status ON payment_batches(status);
CREATE INDEX IF NOT EXISTS idx_bl_batch ON batch_lines(batch_id);

-- Timestamp function
CREATE OR REPLACE FUNCTION update_payment_batches_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pb_updated ON payment_batches;
CREATE TRIGGER pb_updated
  BEFORE UPDATE ON payment_batches
  FOR EACH ROW EXECUTE FUNCTION update_payment_batches_timestamp();
