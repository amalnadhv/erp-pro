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
