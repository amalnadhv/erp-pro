-- ============================================================
-- Advanced ERP Pro - Consolidated Database Schema
-- Apply in the Supabase SQL Editor (or supabase db push).
-- Idempotent: safe to re-run. Order follows FK dependencies.
-- ============================================================


-- ===== source: setup.sql =====

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(30) UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(30),
    customer_address TEXT,
    customer_vat VARCHAR(50),
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(12,2) DEFAULT 0,
    vat_percent DECIMAL(5,2) DEFAULT 15,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(30) DEFAULT 'Cash',
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_invoice_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_invoice_no ON invoices;
CREATE TRIGGER trg_set_invoice_no
BEFORE INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION set_invoice_no();

-- ============ CUSTOMER MASTER (extended fields) ============
ALTER TABLE customers ADD COLUMN IF NOT EXISTS code VARCHAR(30) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cust_type VARCHAR(30) DEFAULT 'Company';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mobile VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Net 30';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_list VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_no VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_code VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 30;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_person VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_address TEXT;

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ============ SUPPLIER MASTER (same structure as customer) ============
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE,
    name VARCHAR(255),
    cust_type VARCHAR(30) DEFAULT 'Company',
    category VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(30),
    mobile VARCHAR(30),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    price_list VARCHAR(50),
    vat_no VARCHAR(50),
    account_code VARCHAR(30),
    credit_days INTEGER DEFAULT 30,
    sales_person VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sup_type VARCHAR(30) DEFAULT 'Distributor';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS min_order_qty INTEGER DEFAULT 1;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pref_payment VARCHAR(30) DEFAULT 'Bank Transfer';

-- ============ STOCK MASTER (extended product fields) ============
ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(30) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'Pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION set_product_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'ITM-' || LPAD((SELECT COUNT(*) + 1 FROM products)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_product_code ON products;
CREATE TRIGGER trg_set_product_code
BEFORE INSERT ON products
FOR EACH ROW EXECUTE FUNCTION set_product_code();

-- ===== source: accounts.sql =====

-- ============================================================
-- CHART OF ACCOUNTS
-- Run this AFTER setup.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('Asset','Liability','Equity','Income','Expense')),
  parent_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  currency      TEXT DEFAULT 'AED',
  is_group      BOOLEAN DEFAULT FALSE,
  status        TEXT DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_updated ON accounts;
CREATE TRIGGER accounts_updated
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_accounts_timestamp();

-- ============================================================
-- SEED DEFAULT CHART OF ACCOUNTS
-- ============================================================

-- Level 1: Account Groups (is_group = true)
INSERT INTO accounts (code, name, type, is_group, status) VALUES
  ('1000', 'Assets',               'Asset',    true, 'Active'),
  ('2000', 'Liabilities',          'Liability',true, 'Active'),
  ('3000', 'Equity',               'Equity',   true, 'Active'),
  ('4000', 'Income',               'Income',   true, 'Active'),
  ('5000', 'Expenses',             'Expense',  true, 'Active')
ON CONFLICT (code) DO NOTHING;

-- Level 2: Sub-groups under Assets
INSERT INTO accounts (code, name, type, parent_id, is_group, status)
SELECT '1100', 'Current Assets', 'Asset', a.id, true, 'Active' FROM accounts a WHERE a.code = '1000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1100')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, is_group, status)
SELECT '1200', 'Non-Current Assets', 'Asset', a.id, true, 'Active' FROM accounts a WHERE a.code = '1000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1200')
ON CONFLICT (code) DO NOTHING;

-- Level 3: Individual accounts under Current Assets
INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '1110', 'Cash on Hand', 'Asset', a.id, 0, 'Active' FROM accounts a WHERE a.code = '1100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1110')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '1120', 'Bank Account — Primary', 'Asset', a.id, 0, 'Active' FROM accounts a WHERE a.code = '1100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1120')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '1130', 'Accounts Receivable', 'Asset', a.id, 0, 'Active' FROM accounts a WHERE a.code = '1100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1130')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '1140', 'Inventory', 'Asset', a.id, 0, 'Active' FROM accounts a WHERE a.code = '1100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1140')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '1150', 'Prepaid Expenses', 'Asset', a.id, 0, 'Active' FROM accounts a WHERE a.code = '1100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1150')
ON CONFLICT (code) DO NOTHING;

-- Non-Current Assets
INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '1210', 'Fixed Assets', 'Asset', a.id, 0, 'Active' FROM accounts a WHERE a.code = '1200'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1210')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '1220', 'Accumulated Depreciation', 'Asset', a.id, 0, 'Active' FROM accounts a WHERE a.code = '1200'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1220')
ON CONFLICT (code) DO NOTHING;

-- Liabilities sub-groups
INSERT INTO accounts (code, name, type, parent_id, is_group, status)
SELECT '2100', 'Current Liabilities', 'Liability', a.id, true, 'Active' FROM accounts a WHERE a.code = '2000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2100')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, is_group, status)
SELECT '2200', 'Non-Current Liabilities', 'Liability', a.id, true, 'Active' FROM accounts a WHERE a.code = '2000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2200')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '2110', 'Accounts Payable', 'Liability', a.id, 0, 'Active' FROM accounts a WHERE a.code = '2100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2110')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '2120', 'VAT Payable', 'Liability', a.id, 0, 'Active' FROM accounts a WHERE a.code = '2100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2120')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '2130', 'Accrued Expenses', 'Liability', a.id, 0, 'Active' FROM accounts a WHERE a.code = '2100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2130')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '2140', 'Short-Term Loans', 'Liability', a.id, 0, 'Active' FROM accounts a WHERE a.code = '2100'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2140')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '2210', 'Long-Term Loans', 'Liability', a.id, 0, 'Active' FROM accounts a WHERE a.code = '2200'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2210')
ON CONFLICT (code) DO NOTHING;

-- Equity
INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '3100', 'Share Capital', 'Equity', a.id, 0, 'Active' FROM accounts a WHERE a.code = '3000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '3100')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '3200', 'Retained Earnings', 'Equity', a.id, 0, 'Active' FROM accounts a WHERE a.code = '3000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '3200')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '3300', 'Current Year Earnings', 'Equity', a.id, 0, 'Active' FROM accounts a WHERE a.code = '3000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '3300')
ON CONFLICT (code) DO NOTHING;

-- Income
INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '4100', 'Sales Revenue', 'Income', a.id, 0, 'Active' FROM accounts a WHERE a.code = '4000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '4100')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '4200', 'Service Revenue', 'Income', a.id, 0, 'Active' FROM accounts a WHERE a.code = '4000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '4200')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '4300', 'Other Income', 'Income', a.id, 0, 'Active' FROM accounts a WHERE a.code = '4000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '4300')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '4400', 'Discount Received', 'Income', a.id, 0, 'Active' FROM accounts a WHERE a.code = '4000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '4400')
ON CONFLICT (code) DO NOTHING;

-- Expenses
INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5100', 'Cost of Goods Sold', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5100')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5200', 'Salaries & Wages', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5200')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5300', 'Rent Expense', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5300')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5400', 'Utilities', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5400')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5500', 'Office Supplies', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5500')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5600', 'Depreciation', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5600')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5700', 'Bank Charges', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5700')
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, parent_id, opening_balance, status)
SELECT '5800', 'Bad Debts', 'Expense', a.id, 0, 'Active' FROM accounts a WHERE a.code = '5000'
AND NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5800')
ON CONFLICT (code) DO NOTHING;


-- ===== source: admin.sql =====

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


-- ===== source: authorization.sql =====

-- ============================================================
-- AUTHORIZATION: Role-Based Access Control
-- Run this AFTER admin.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role            TEXT NOT NULL CHECK (role IN ('Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer')),
  module          TEXT NOT NULL,
  can_view        BOOLEAN DEFAULT FALSE,
  can_create      BOOLEAN DEFAULT FALSE,
  can_edit        BOOLEAN DEFAULT FALSE,
  can_delete      BOOLEAN DEFAULT FALSE,
  can_approve     BOOLEAN DEFAULT FALSE,
  can_print       BOOLEAN DEFAULT FALSE,
  UNIQUE(role, module)
);

-- Seed default permissions (Admin gets all, Viewer gets minimal)
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_print) VALUES
  -- Admin = everything
  ('Admin', 'Company Profile',       TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Users & Roles',         TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
  ('Admin', 'Document Numbering',    TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
  ('Admin', 'Chart of Accounts',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Journal Entry',         TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'A/R Invoice',           TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Purchase Order',        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Stock Master',          TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Customer',              TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Supplier',              TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Incoming Payments',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Outgoing Payments',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  -- Manager
  ('Manager', 'A/R Invoice',         TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Purchase Order',      TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Stock Master',        TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Customer',            TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Supplier',            TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Incoming Payments',   TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Outgoing Payments',   TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Journal Entry',       TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Chart of Accounts',   TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  -- Accountant
  ('Accountant', 'Chart of Accounts',TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('Accountant', 'Journal Entry',    TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Accountant', 'Incoming Payments',TRUE, TRUE, FALSE, FALSE, TRUE, TRUE),
  ('Accountant', 'Outgoing Payments',TRUE, TRUE, FALSE, FALSE, TRUE, TRUE),
  ('Accountant', 'A/R Invoice',      TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('Accountant', 'Purchase Order',   TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  -- Sales Rep
  ('Sales Rep', 'A/R Invoice',       TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('Sales Rep', 'Customer',          TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
  ('Sales Rep', 'Stock Master',      TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('Sales Rep', 'Incoming Payments', TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
  -- Warehouse
  ('Warehouse', 'Stock Master',      TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('Warehouse', 'Purchase Order',    TRUE, FALSE, TRUE, FALSE, FALSE, TRUE),
  -- Viewer
  ('Viewer', 'A/R Invoice',          TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('Viewer', 'Purchase Order',       TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('Viewer', 'Stock Master',         TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('Viewer', 'Customer',             TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('Viewer', 'Supplier',             TRUE, FALSE, FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_rp_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_rp_module ON role_permissions(module);


-- ===== source: journal.sql =====

-- ============================================================
-- JOURNAL ENTRIES
-- Run this AFTER setup.sql and accounts.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_no      TEXT NOT NULL UNIQUE,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference     TEXT DEFAULT '',
  narration     TEXT DEFAULT '',
  status        TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Posted','Void')),
  total_debit   NUMERIC(15,2) DEFAULT 0,
  total_credit  NUMERIC(15,2) DEFAULT 0,
  currency      TEXT DEFAULT 'AED',
  created_by    TEXT DEFAULT 'Admin',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id      UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_no       INTEGER NOT NULL,
  account_id    UUID NOT NULL REFERENCES accounts(id),
  debit         NUMERIC(15,2) DEFAULT 0,
  credit        NUMERIC(15,2) DEFAULT 0,
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_jl_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_journal_entries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entries_updated ON journal_entries;
CREATE TRIGGER journal_entries_updated
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_journal_entries_timestamp();

-- Auto-number trigger
CREATE OR REPLACE FUNCTION set_journal_entry_no()
RETURNS TRIGGER AS $$
DECLARE
  next_no INTEGER;
BEGIN
  IF NEW.entry_no IS NULL OR NEW.entry_no = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_no FROM 4) AS INTEGER)), 0) + 1
    INTO next_no FROM journal_entries;
    NEW.entry_no := 'JE-' || LPAD(next_no::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS je_autonumber ON journal_entries;
CREATE TRIGGER je_autonumber
  BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION set_journal_entry_no();


-- ===== source: exchange_rates.sql =====

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


-- ===== source: banking.sql =====

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


-- ===== source: recurring_journal.sql =====

-- ============================================================
-- RECURRING JOURNAL ENTRIES
-- Run this AFTER journal.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_journal (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name   TEXT NOT NULL,
  reference       TEXT DEFAULT '',
  narration       TEXT DEFAULT '',
  frequency       TEXT NOT NULL CHECK (frequency IN ('Weekly','Bi-Weekly','Monthly','Quarterly','Semi-Annual','Annual')),
  start_date      DATE NOT NULL,
  end_date        DATE,
  next_run_date   DATE NOT NULL,
  currency        TEXT DEFAULT 'AED',
  status          TEXT DEFAULT 'Active' CHECK (status IN ('Active','Paused','Completed')),
  last_run_date   DATE,
  run_count       INTEGER DEFAULT 0,
  created_by      TEXT DEFAULT 'Admin',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_journal_lines (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_id    UUID NOT NULL REFERENCES recurring_journal(id) ON DELETE CASCADE,
  line_no         INTEGER NOT NULL,
  account_id      UUID NOT NULL REFERENCES accounts(id),
  debit           NUMERIC(15,2) DEFAULT 0,
  credit          NUMERIC(15,2) DEFAULT 0,
  description     TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_rj_next_run ON recurring_journal(next_run_date);
CREATE INDEX IF NOT EXISTS idx_rj_status ON recurring_journal(status);
CREATE INDEX IF NOT EXISTS idx_rjl_recurring ON recurring_journal_lines(recurring_id);

CREATE OR REPLACE FUNCTION update_recurring_journal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recurring_journal_updated ON recurring_journal;
CREATE TRIGGER recurring_journal_updated
  BEFORE UPDATE ON recurring_journal
  FOR EACH ROW EXECUTE FUNCTION update_recurring_journal_timestamp();


-- ===== source: payment_batches.sql =====

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


-- ===== source: reconciliation.sql =====

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


-- ===== source: sales_pipeline.sql =====

-- ============================================================
-- SALES PIPELINE: Quotations & Orders
-- Run after setup.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no        VARCHAR(30) UNIQUE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   VARCHAR(255),
  doc_date        DATE DEFAULT CURRENT_DATE,
  valid_until     DATE,
  currency        VARCHAR(10) DEFAULT 'AED',
  payment_terms   VARCHAR(50) DEFAULT 'Net 30',
  items           JSONB DEFAULT '[]'::jsonb,
  subtotal        DECIMAL(14,2) DEFAULT 0,
  vat_percent     DECIMAL(5,2) DEFAULT 5,
  vat_amount      DECIMAL(14,2) DEFAULT 0,
  grand_total     DECIMAL(14,2) DEFAULT 0,
  notes           TEXT,
  status          VARCHAR(20) DEFAULT 'Draft',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no        VARCHAR(30) UNIQUE,
  quote_id        UUID REFERENCES sales_quotations(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   VARCHAR(255),
  doc_date        DATE DEFAULT CURRENT_DATE,
  delivery_date   DATE,
  currency        VARCHAR(10) DEFAULT 'AED',
  payment_terms   VARCHAR(50) DEFAULT 'Net 30',
  items           JSONB DEFAULT '[]'::jsonb,
  subtotal        DECIMAL(14,2) DEFAULT 0,
  vat_percent     DECIMAL(5,2) DEFAULT 5,
  vat_amount      DECIMAL(14,2) DEFAULT 0,
  grand_total     DECIMAL(14,2) DEFAULT 0,
  notes           TEXT,
  status          VARCHAR(20) DEFAULT 'Draft',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auto numbering
CREATE OR REPLACE FUNCTION set_quote_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_no IS NULL OR NEW.quote_no = '' THEN
    NEW.quote_no := 'QTN-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_quote_no ON sales_quotations;
CREATE TRIGGER trg_set_quote_no
BEFORE INSERT ON sales_quotations
FOR EACH ROW EXECUTE FUNCTION set_quote_no();

CREATE OR REPLACE FUNCTION set_so_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no := 'SO-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_so_no ON sales_orders;
CREATE TRIGGER trg_set_so_no
BEFORE INSERT ON sales_orders
FOR EACH ROW EXECUTE FUNCTION set_so_no();

CREATE INDEX IF NOT EXISTS idx_sq_status ON sales_quotations(status);
CREATE INDEX IF NOT EXISTS idx_sq_cust ON sales_quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_cust ON sales_orders(customer_id);

CREATE OR REPLACE FUNCTION update_sales_docs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sq_updated ON sales_quotations;
CREATE TRIGGER sq_updated BEFORE UPDATE ON sales_quotations
FOR EACH ROW EXECUTE FUNCTION update_sales_docs_timestamp();

DROP TRIGGER IF EXISTS so_updated ON sales_orders;
CREATE TRIGGER so_updated BEFORE UPDATE ON sales_orders
FOR EACH ROW EXECUTE FUNCTION update_sales_docs_timestamp();


-- ===== source: extended_modules.sql =====

-- ============================================================
-- EXTENDED MODULES: generic module records + doc-type tables
-- Run after setup.sql and sales_pipeline.sql
-- ============================================================

-- ---------- Generic module records table ----------
CREATE TABLE IF NOT EXISTS module_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      VARCHAR(100) NOT NULL,
  status      VARCHAR(30) DEFAULT 'Active',
  data        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_module_records_module ON module_records(module);
CREATE INDEX IF NOT EXISTS idx_module_records_status ON module_records(status);

-- ---------- Document-type tables (full doc schema) ----------
CREATE TABLE IF NOT EXISTS delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ar_credit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_credit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS landed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_no VARCHAR(30) UNIQUE,
  party_id UUID,
  party_name VARCHAR(255),
  doc_date DATE DEFAULT CURRENT_DATE,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(14,2) DEFAULT 0,
  vat_percent DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Auto numbering for doc tables ----------
CREATE OR REPLACE FUNCTION set_ext_doc_no()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'delivery_notes' AND (NEW.delivery_no IS NULL OR NEW.delivery_no = '') THEN
    NEW.delivery_no := 'DN-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'ar_credit_memos' AND (NEW.memo_no IS NULL OR NEW.memo_no = '') THEN
    NEW.memo_no := 'ACR-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'ap_credit_memos' AND (NEW.memo_no IS NULL OR NEW.memo_no = '') THEN
    NEW.memo_no := 'APC-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'sales_returns' AND (NEW.return_no IS NULL OR NEW.return_no = '') THEN
    NEW.return_no := 'SR-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'purchase_returns' AND (NEW.return_no IS NULL OR NEW.return_no = '') THEN
    NEW.return_no := 'PRT-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'purchase_requisitions' AND (NEW.req_no IS NULL OR NEW.req_no = '') THEN
    NEW.req_no := 'REQ-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'purchase_orders' AND (NEW.po_no IS NULL OR NEW.po_no = '') THEN
    NEW.po_no := 'PO-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'goods_receipts' AND (NEW.grn_no IS NULL OR NEW.grn_no = '') THEN
    NEW.grn_no := 'GRN-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'purchase_invoices' AND (NEW.pin_no IS NULL OR NEW.pin_no = '') THEN
    NEW.pin_no := 'PIN-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'landed_costs' AND (NEW.lc_no IS NULL OR NEW.lc_no = '') THEN
    NEW.lc_no := 'LC-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_ext_doc_no_delivery BEFORE INSERT ON delivery_notes FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_ar_memo BEFORE INSERT ON ar_credit_memos FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_ap_memo BEFORE INSERT ON ap_credit_memos FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_sales_return BEFORE INSERT ON sales_returns FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_purchase_return BEFORE INSERT ON purchase_returns FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_req BEFORE INSERT ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_po BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_grn BEFORE INSERT ON goods_receipts FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_pin BEFORE INSERT ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
CREATE TRIGGER trg_set_ext_doc_no_lc BEFORE INSERT ON landed_costs FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_party ON delivery_notes(party_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_ar_credit_memos_party ON ar_credit_memos(party_id);
CREATE INDEX IF NOT EXISTS idx_ar_credit_memos_status ON ar_credit_memos(status);
CREATE INDEX IF NOT EXISTS idx_sales_returns_party ON sales_returns(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_party ON purchase_requisitions(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_party ON purchase_orders(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_party ON goods_receipts(party_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON goods_receipts(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_party ON purchase_invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ap_credit_memos_party ON ap_credit_memos(party_id);
CREATE INDEX IF NOT EXISTS idx_ap_credit_memos_status ON ap_credit_memos(status);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_party ON purchase_returns(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_status ON purchase_returns(status);
CREATE INDEX IF NOT EXISTS idx_landed_costs_party ON landed_costs(party_id);
CREATE INDEX IF NOT EXISTS idx_landed_costs_status ON landed_costs(status);
