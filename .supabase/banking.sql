-- ============================================================
-- BANKING: INCOMING & OUTGOING PAYMENTS
-- Run this AFTER journal.sql and accounts.sql
-- ============================================================

-- INCOMING PAYMENTS (received from customers)
CREATE TABLE IF NOT EXISTS incoming_payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_no        TEXT NOT NULL UNIQUE,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id       UUID REFERENCES customers(id),
  payment_method    TEXT DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Cash','Bank Transfer','Cheque','Credit Card','Other')),
  bank_account_id   UUID REFERENCES accounts(id),
  reference         TEXT DEFAULT '',
  amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency          TEXT DEFAULT 'AED',
  exchange_rate     NUMERIC(10,4) DEFAULT 1,
  notes             TEXT DEFAULT '',
  status            TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Approved','Cancelled')),
  applied_to        TEXT DEFAULT 'AR Invoice',
  ar_entry_id       UUID REFERENCES journal_entries(id),
  created_by        TEXT DEFAULT 'Admin',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- OUTGOING PAYMENTS (paid to suppliers)
CREATE TABLE IF NOT EXISTS outgoing_payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_no        TEXT NOT NULL UNIQUE,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id       UUID REFERENCES suppliers(id),
  payment_method    TEXT DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Cash','Bank Transfer','Cheque','Credit Card','Other')),
  bank_account_id   UUID REFERENCES accounts(id),
  reference         TEXT DEFAULT '',
  amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency          TEXT DEFAULT 'AED',
  exchange_rate     NUMERIC(10,4) DEFAULT 1,
  notes             TEXT DEFAULT '',
  status            TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Approved','Cancelled')),
  applied_to        TEXT DEFAULT 'AP Invoice',
  ap_entry_id       UUID REFERENCES journal_entries(id),
  created_by        TEXT DEFAULT 'Admin',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- AUTO-NUMBERING
CREATE OR REPLACE FUNCTION set_incoming_payment_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_no IS NULL OR NEW.payment_no = '' THEN
    NEW.payment_no := 'RCP-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(payment_no FROM 5) AS INT)), 0) + 1 FROM incoming_payments)::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_incoming_payment_no ON incoming_payments;
CREATE TRIGGER set_incoming_payment_no
  BEFORE INSERT ON incoming_payments
  FOR EACH ROW EXECUTE FUNCTION set_incoming_payment_no();

CREATE OR REPLACE FUNCTION set_outgoing_payment_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_no IS NULL OR NEW.payment_no = '' THEN
    NEW.payment_no := 'PAY-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(payment_no FROM 5) AS INT)), 0) + 1 FROM outgoing_payments)::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_outgoing_payment_no ON outgoing_payments;
CREATE TRIGGER set_outgoing_payment_no
  BEFORE INSERT ON outgoing_payments
  FOR EACH ROW EXECUTE FUNCTION set_outgoing_payment_no();

-- TIMESTAMP TRIGGERS
CREATE OR REPLACE FUNCTION update_incoming_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incoming_payment_updated ON incoming_payments;
CREATE TRIGGER incoming_payment_updated
  BEFORE UPDATE ON incoming_payments
  FOR EACH ROW EXECUTE FUNCTION update_incoming_payment_timestamp();

CREATE OR REPLACE FUNCTION update_outgoing_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outgoing_payment_updated ON outgoing_payments;
CREATE TRIGGER outgoing_payment_updated
  BEFORE UPDATE ON outgoing_payments
  FOR EACH ROW EXECUTE FUNCTION update_outgoing_payment_timestamp();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_ip_customer ON incoming_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_ip_date ON incoming_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_ip_status ON incoming_payments(status);
CREATE INDEX IF NOT EXISTS idx_op_supplier ON outgoing_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_op_date ON outgoing_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_op_status ON outgoing_payments(status);
