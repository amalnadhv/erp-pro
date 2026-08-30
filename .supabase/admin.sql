-- ============================================================
-- ADMINISTRATION: Company Profile, Users, Document Numbering
-- ============================================================

-- COMPANY PROFILE (single-row settings)
CREATE TABLE IF NOT EXISTS company_profile (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name    TEXT NOT NULL DEFAULT 'My Company',
  legal_name      TEXT DEFAULT '',
  trade_name      TEXT DEFAULT '',
  tax_id          TEXT DEFAULT '',
  cr_number       TEXT DEFAULT '',
  vat_number      TEXT DEFAULT '',
  address_line1   TEXT DEFAULT '',
  address_line2   TEXT DEFAULT '',
  city            TEXT DEFAULT '',
  state           TEXT DEFAULT '',
  country         TEXT DEFAULT 'UAE',
  postal_code     TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  website         TEXT DEFAULT '',
  logo_url        TEXT DEFAULT '',
  fiscal_year_start TEXT DEFAULT '01',
  base_currency   TEXT DEFAULT 'AED',
  vat_rate        NUMERIC(5,2) DEFAULT 5.00,
  zatca_enabled   BOOLEAN DEFAULT FALSE,
  zatca_endpoint  TEXT DEFAULT '',
  zatca_csid      TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default profile if none exists
INSERT INTO company_profile (company_name, country, base_currency)
SELECT 'My Company', 'UAE', 'AED'
WHERE NOT EXISTS (SELECT 1 FROM company_profile);

CREATE OR REPLACE FUNCTION update_company_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_profile_updated ON company_profile;
CREATE TRIGGER company_profile_updated
  BEFORE UPDATE ON company_profile
  FOR EACH ROW EXECUTE FUNCTION update_company_profile_timestamp();

-- USERS
CREATE TABLE IF NOT EXISTS erp_users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL DEFAULT '',
  email           TEXT DEFAULT '',
  password_hash   TEXT DEFAULT '',
  role            TEXT DEFAULT 'Viewer' CHECK (role IN ('Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer')),
  status          TEXT DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Locked')),
  phone           TEXT DEFAULT '',
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin user
INSERT INTO erp_users (username, full_name, role, status)
SELECT 'admin', 'System Administrator', 'Admin', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM erp_users WHERE username = 'admin');

CREATE OR REPLACE FUNCTION update_erp_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS erp_users_updated ON erp_users;
CREATE TRIGGER erp_users_updated
  BEFORE UPDATE ON erp_users
  FOR EACH ROW EXECUTE FUNCTION update_erp_users_timestamp();

-- DOCUMENT NUMBERING
CREATE TABLE IF NOT EXISTS doc_numbering (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type        TEXT NOT NULL UNIQUE,
  prefix          TEXT NOT NULL DEFAULT '',
  format          TEXT NOT NULL DEFAULT 'PREFIX-00001',
  next_number     INTEGER NOT NULL DEFAULT 1,
  pad_length      INTEGER NOT NULL DEFAULT 5,
  separator       TEXT DEFAULT '-',
  suffix          TEXT DEFAULT '',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default document types
INSERT INTO doc_numbering (doc_type, prefix, format, next_number, pad_length) VALUES
  ('Sales Invoice', 'INV', 'INV-00001', 1, 5),
  ('Purchase Order', 'PO', 'PO-00001', 1, 5),
  ('Journal Entry', 'JE', 'JE-00001', 1, 5),
  ('Incoming Payment', 'RCP', 'RCP-00001', 1, 5),
  ('Outgoing Payment', 'PAY', 'PAY-00001', 1, 5),
  ('Customer', 'CUST', 'CUST-00001', 1, 5),
  ('Supplier', 'SUP', 'SUP-00001', 1, 5),
  ('Product', 'PRD', 'PRD-00001', 1, 5)
ON CONFLICT (doc_type) DO NOTHING;

CREATE OR REPLACE FUNCTION update_doc_numbering_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doc_numbering_updated ON doc_numbering;
CREATE TRIGGER doc_numbering_updated
  BEFORE UPDATE ON doc_numbering
  FOR EACH ROW EXECUTE FUNCTION update_doc_numbering_timestamp();

CREATE INDEX IF NOT EXISTS idx_erp_users_role ON erp_users(role);
CREATE INDEX IF NOT EXISTS idx_erp_users_status ON erp_users(status);
