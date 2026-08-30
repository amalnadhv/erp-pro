-- ============================================================
-- EXCHANGE RATES
-- Run this after journal.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   VARCHAR(10) NOT NULL,
  to_currency     VARCHAR(10) NOT NULL,
  rate            DECIMAL(16,6) NOT NULL,
  rate_date       DATE NOT NULL,
  rate_type       VARCHAR(20) DEFAULT 'Spot',
  source          VARCHAR(50),
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      VARCHAR(100),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency, rate_date)
);

CREATE INDEX IF NOT EXISTS idx_er_from_curr ON exchange_rates(from_currency);
CREATE INDEX IF NOT EXISTS idx_er_to_curr ON exchange_rates(to_currency);
CREATE INDEX IF NOT EXISTS idx_er_date ON exchange_rates(rate_date);
CREATE INDEX IF NOT EXISTS idx_er_active ON exchange_rates(is_active);

-- Function to get latest rate
CREATE OR REPLACE FUNCTION get_latest_rate(from_cur VARCHAR, to_cur VARCHAR)
RETURNS DECIMAL(16,6) AS $$
DECLARE
  r DECIMAL(16,6);
BEGIN
  SELECT rate INTO r FROM exchange_rates
  WHERE from_currency = from_cur
    AND to_currency = to_cur
    AND is_active = TRUE
  ORDER BY rate_date DESC
  LIMIT 1;
  RETURN r;
END;
$$ LANGUAGE plpgsql;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION update_exchange_rates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS er_updated ON exchange_rates;
CREATE TRIGGER er_updated
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW EXECUTE FUNCTION update_exchange_rates_timestamp();
