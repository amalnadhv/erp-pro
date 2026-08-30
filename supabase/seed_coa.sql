-- ============================================================
-- Starter Chart of Accounts seed
-- Run AFTER schema.sql. Idempotent (ON CONFLICT code DO NOTHING).
-- current_balance is set to the signed opening balance:
--   Asset / Expense  -> positive (debit-normal)
--   Liability / Equity / Income -> negative (credit-normal)
-- ============================================================

INSERT INTO accounts (code, name, type, parent_id, opening_balance, current_balance, currency, is_group, status, notes) VALUES
  ('1000', 'Cash in Hand',            'Asset',     NULL, 0,    0,     'AED', false, 'Active', 'Cash on hand'),
  ('1010', 'Bank Account',            'Asset',     NULL, 0,    0,     'AED', false, 'Active', 'Main bank'),
  ('1200', 'Accounts Receivable',     'Asset',     NULL, 0,    0,     'AED', false, 'Active', 'Customer receivables'),
  ('1300', 'Inventory',               'Asset',     NULL, 0,    0,     'AED', false, 'Active', 'Stock on hand'),
  ('1400', 'VAT Recoverable',         'Asset',     NULL, 0,    0,     'AED', false, 'Active', 'Input VAT'),
  ('2000', 'Accounts Payable',        'Liability', NULL, 0,    0,     'AED', false, 'Active', 'Supplier payables'),
  ('2100', 'VAT Payable',             'Liability', NULL, 0,    0,     'AED', false, 'Active', 'Output VAT'),
  ('2200', 'Accrued Liabilities',     'Liability', NULL, 0,    0,     'AED', false, 'Active', 'Accruals'),
  ('3000', 'Owner Capital',           'Equity',    NULL, 50000, -50000, 'AED', false, 'Active', 'Opening capital'),
  ('3100', 'Retained Earnings',       'Equity',    NULL, 0,    0,     'AED', false, 'Active', 'Accumulated profit/loss'),
  ('4000', 'Sales Revenue',           'Income',    NULL, 0,    0,     'AED', false, 'Active', 'Product sales'),
  ('4100', 'Other Income',            'Income',    NULL, 0,    0,     'AED', false, 'Active', 'Misc income'),
  ('5000', 'Cost of Goods Sold',      'Expense',   NULL, 0,    0,     'AED', false, 'Active', 'COGS'),
  ('5100', 'Salaries & Wages',        'Expense',   NULL, 0,    0,     'AED', false, 'Active', 'Payroll'),
  ('5200', 'Rent Expense',            'Expense',   NULL, 0,    0,     'AED', false, 'Active', 'Rent'),
  ('5300', 'Utilities Expense',       'Expense',   NULL, 0,    0,     'AED', false, 'Active', 'Utilities'),
  ('5400', 'General & Administrative', 'Expense',  NULL, 0,    0,     'AED', false, 'Active', 'G&A')
ON CONFLICT (code) DO NOTHING;
