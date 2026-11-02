-- Generated from the supabase/*.sql files by server/import-schema.mjs.
-- Do not hand-edit: rerun the converter instead.
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  code TEXT UNIQUE,
  sku TEXT,
  barcode TEXT,
  unit TEXT DEFAULT 'Pcs',
  cost_price REAL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  location TEXT,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  hsn_code TEXT,
  vat_rate REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  attachments TEXT DEFAULT '[]',
  tenant_id TEXT REFERENCES tenants(id),
  valuation_method TEXT DEFAULT 'Weighted Average',
  cost_method TEXT DEFAULT 'FIFO'
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  code TEXT UNIQUE,
  name TEXT,
  cust_type TEXT DEFAULT 'Company',
  category TEXT,
  mobile TEXT,
  website TEXT,
  region TEXT,
  postal_code TEXT,
  currency TEXT DEFAULT 'USD',
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit REAL DEFAULT 0,
  opening_balance REAL DEFAULT 0,
  price_list TEXT,
  vat_no TEXT,
  account_code TEXT,
  credit_days INTEGER DEFAULT 30,
  sales_person TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  attachments TEXT DEFAULT '[]',
  ship_address TEXT,
  tenant_id TEXT REFERENCES tenants(id),
  stmt_consent INTEGER DEFAULT 0,
  stmt_schedule TEXT DEFAULT 'Monthly'
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  product_id TEXT REFERENCES products(id),
  quantity INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reorder_level INTEGER DEFAULT 10,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_vat TEXT,
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 15,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  amount_paid REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id),
  invoice_date TEXT,
  due_date TEXT,
  customer_id TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  cust_type TEXT DEFAULT 'Company',
  category TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT,
  currency TEXT DEFAULT 'USD',
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit REAL DEFAULT 0,
  opening_balance REAL DEFAULT 0,
  price_list TEXT,
  vat_no TEXT,
  account_code TEXT,
  credit_days INTEGER DEFAULT 30,
  sales_person TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  attachments TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sup_type TEXT DEFAULT 'Distributor',
  contact_person TEXT,
  lead_time_days INTEGER DEFAULT 7,
  min_order_qty INTEGER DEFAULT 1,
  bank_name TEXT,
  bank_iban TEXT,
  pref_payment TEXT DEFAULT 'Bank Transfer',
  tenant_id TEXT REFERENCES tenants(id),
  stmt_consent INTEGER DEFAULT 0,
  stmt_schedule TEXT DEFAULT 'Monthly'
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Asset','Liability','Equity','Income','Expense')),
  parent_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  is_group INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS company_profile (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'My Company',
  legal_name TEXT DEFAULT '',
  trade_name TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  cr_number TEXT DEFAULT '',
  vat_number TEXT DEFAULT '',
  address_line1 TEXT DEFAULT '',
  address_line2 TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT 'UAE',
  postal_code TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  fiscal_year_start TEXT DEFAULT '01',
  base_currency TEXT DEFAULT 'AED',
  vat_rate REAL DEFAULT 5.00,
  zatca_enabled INTEGER DEFAULT 0,
  zatca_endpoint TEXT DEFAULT '',
  zatca_csid TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  auditor_firm TEXT,
  auditor_name TEXT,
  auditor_license TEXT,
  auditor_address TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  password_hash TEXT DEFAULT '',
  role TEXT DEFAULT 'Viewer' CHECK (role IN ('Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Locked')),
  phone TEXT DEFAULT '',
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doc_numbering (
  id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'PREFIX-00001',
  next_number INTEGER NOT NULL DEFAULT 1,
  pad_length INTEGER NOT NULL DEFAULT 5,
  separator TEXT DEFAULT '-',
  suffix TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer')),
  module TEXT NOT NULL,
  can_view INTEGER DEFAULT 0,
  can_create INTEGER DEFAULT 0,
  can_edit INTEGER DEFAULT 0,
  can_delete INTEGER DEFAULT 0,
  can_approve INTEGER DEFAULT 0,
  can_print INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  entry_no TEXT NOT NULL UNIQUE,
  entry_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT DEFAULT '',
  narration TEXT DEFAULT '',
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Posted','Void')),
  total_debit REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  created_by TEXT DEFAULT 'Admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  rate_date TEXT NOT NULL,
  rate_type TEXT DEFAULT 'Spot',
  source TEXT,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS incoming_payments (
  id TEXT PRIMARY KEY,
  payment_no TEXT NOT NULL UNIQUE,
  payment_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  customer_id TEXT REFERENCES customers(id),
  payment_method TEXT DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Cash','Bank Transfer','Cheque','Credit Card','Other')),
  bank_account_id TEXT REFERENCES accounts(id),
  reference TEXT DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  exchange_rate REAL DEFAULT 1,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Approved','Cancelled')),
  applied_to TEXT DEFAULT 'AR Invoice',
  ar_entry_id TEXT REFERENCES journal_entries(id),
  created_by TEXT DEFAULT 'Admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id),
  cheque_no TEXT,
  cheque_date TEXT,
  customer_name TEXT
);

CREATE TABLE IF NOT EXISTS outgoing_payments (
  id TEXT PRIMARY KEY,
  payment_no TEXT NOT NULL UNIQUE,
  payment_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  supplier_id TEXT REFERENCES suppliers(id),
  payment_method TEXT DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Cash','Bank Transfer','Cheque','Credit Card','Other')),
  bank_account_id TEXT REFERENCES accounts(id),
  reference TEXT DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  exchange_rate REAL DEFAULT 1,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Approved','Cancelled')),
  applied_to TEXT DEFAULT 'AP Invoice',
  ap_entry_id TEXT REFERENCES journal_entries(id),
  created_by TEXT DEFAULT 'Admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id),
  cheque_no TEXT,
  cheque_date TEXT,
  supplier_name TEXT
);

CREATE TABLE IF NOT EXISTS recurring_journal (
  id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL,
  reference TEXT DEFAULT '',
  narration TEXT DEFAULT '',
  frequency TEXT NOT NULL CHECK (frequency IN ('Weekly','Bi-Weekly','Monthly','Quarterly','Semi-Annual','Annual')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  next_run_date TEXT NOT NULL,
  currency TEXT DEFAULT 'AED',
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Paused','Completed')),
  last_run_date TEXT,
  run_count INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'Admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_journal_lines (
  id TEXT PRIMARY KEY,
  recurring_id TEXT NOT NULL REFERENCES recurring_journal(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payment_batches (
  id TEXT PRIMARY KEY,
  batch_name TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('Incoming', 'Outgoing')),
  bank_account TEXT,
  payment_method TEXT,
  total_amount REAL DEFAULT 0,
  payment_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS batch_lines (
  id TEXT PRIMARY KEY,
  batch_id TEXT REFERENCES payment_batches(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  transaction_id TEXT,
  description TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'AED',
  reference TEXT,
  sequence INTEGER,
  processed INTEGER DEFAULT 0,
  processed_at TEXT,
  notes TEXT,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id),
  statement_date TEXT NOT NULL,
  statement_balance REAL NOT NULL,
  book_balance REAL NOT NULL,
  difference REAL NOT NULL,
  status TEXT DEFAULT 'Draft',
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS bank_recon_lines (
  id TEXT PRIMARY KEY,
  recon_id TEXT REFERENCES bank_reconciliation(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  transaction_id TEXT,
  transaction_date TEXT,
  description TEXT,
  amount REAL NOT NULL,
  statement_ind INTEGER DEFAULT 0,
  book_ind INTEGER DEFAULT 0,
  matched INTEGER DEFAULT 0,
  notes TEXT,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS sales_quotations (
  id TEXT PRIMARY KEY,
  quote_no TEXT UNIQUE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  valid_until TEXT,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 5,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE,
  quote_id TEXT REFERENCES sales_quotations(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  delivery_date TEXT,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 5,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS module_records (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_notes (
  id TEXT PRIMARY KEY,
  delivery_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS ar_credit_memos (
  id TEXT PRIMARY KEY,
  memo_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  return_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id TEXT PRIMARY KEY,
  req_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  grn_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id TEXT PRIMARY KEY,
  pin_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id),
  other_costs REAL DEFAULT 0,
  other_cost_desc TEXT,
  due_date TEXT
);

CREATE TABLE IF NOT EXISTS ap_credit_memos (
  id TEXT PRIMARY KEY,
  memo_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  return_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS landed_costs (
  id TEXT PRIMARY KEY,
  lc_no TEXT UNIQUE,
  party_id TEXT,
  party_name TEXT,
  doc_date TEXT DEFAULT CURRENT_DATE,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id),
  grn_id TEXT REFERENCES goods_receipts(id),
  grn_no TEXT,
  cost_lines TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  credit_amount REAL DEFAULT 0,
  monthly_price REAL DEFAULT 0,
  max_users INTEGER DEFAULT 5,
  max_storage_mb INTEGER DEFAULT 5120,
  max_transactions INTEGER DEFAULT 5000,
  features TEXT DEFAULT '{}',
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_name TEXT DEFAULT 'Starter',
  credit_balance REAL DEFAULT 100.00,
  credit_used REAL DEFAULT 0,
  credit_initial REAL DEFAULT 100.00,
  currency TEXT DEFAULT 'AED',
  expires_at TEXT DEFAULT (date('now','+30 days')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Suspended','Cancelled')),
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'Viewer' CHECK (role IN ('Owner','Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer')),
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_credits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('Credit','Debit','Refund','Bonus','Expiry')),
  description TEXT,
  module TEXT,
  ref_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_metering (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL,
  storage_mb REAL DEFAULT 0,
  user_count INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_pm_id TEXT,
  brand TEXT,
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Pending','Paid','Failed','Void')),
  description TEXT,
  period_start TEXT,
  period_end TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  detail TEXT,
  user_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS tax_config (
  id TEXT PRIMARY KEY,
  country TEXT UNIQUE NOT NULL,
  tax_name TEXT NOT NULL DEFAULT 'VAT',
  standard_rate REAL NOT NULL DEFAULT 0,
  reduced_rate REAL DEFAULT 0,
  zero_rate REAL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  tax_authority TEXT,
  compliance_mode TEXT DEFAULT 'None',
  tax_id_label TEXT DEFAULT 'Tax ID',
  invoice_label TEXT DEFAULT 'Tax Invoice',
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS item_groups (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  code TEXT,
  name TEXT NOT NULL,
  parent_group TEXT,
  description TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  code TEXT,
  name TEXT NOT NULL,
  location TEXT,
  manager TEXT,
  capacity_units INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'AED',
  base_pricelist TEXT,
  valid_from TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_persons (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  code TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  commission_rate REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  lead_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  stage TEXT DEFAULT 'New',
  estimated_value REAL DEFAULT 0,
  status TEXT DEFAULT 'Open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_targets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  sales_person TEXT NOT NULL,
  fiscal_year INTEGER DEFAULT (CAST(strftime('%Y','now') AS INTEGER)),
  period TEXT DEFAULT 'Monthly',
  target_amount REAL DEFAULT 0,
  achieved REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  code TEXT,
  name TEXT NOT NULL,
  department TEXT,
  manager TEXT,
  annual_budget REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  budget_code TEXT NOT NULL,
  fiscal_year INTEGER DEFAULT (CAST(strftime('%Y','now') AS INTEGER)),
  period TEXT DEFAULT 'Annual',
  account_name TEXT,
  amount REAL DEFAULT 0,
  spent REAL DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debit_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  note_no TEXT UNIQUE,
  party_name TEXT,
  party_type TEXT DEFAULT 'Customer',
  doc_date TEXT DEFAULT CURRENT_DATE,
  amount REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  note_no TEXT UNIQUE,
  party_name TEXT,
  party_type TEXT DEFAULT 'Customer',
  doc_date TEXT DEFAULT CURRENT_DATE,
  amount REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_serials (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  batch_no TEXT NOT NULL,
  item_name TEXT,
  product_id TEXT REFERENCES products(id),
  quantity INTEGER DEFAULT 0,
  expiry_date TEXT,
  serial_range TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pick_pack (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  pick_no TEXT UNIQUE,
  order_ref TEXT,
  customer_name TEXT,
  pick_date TEXT DEFAULT CURRENT_DATE,
  items TEXT DEFAULT '[]',
  status TEXT DEFAULT 'Pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barcodes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  barcode TEXT UNIQUE NOT NULL,
  product_id TEXT REFERENCES products(id),
  product_name TEXT,
  uom TEXT DEFAULT 'PC',
  is_primary INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petty_cash (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  voucher_no TEXT UNIQUE,
  doc_date TEXT DEFAULT CURRENT_DATE,
  payee TEXT,
  description TEXT,
  amount REAL DEFAULT 0,
  type TEXT DEFAULT 'Expense' CHECK (type IN ('Expense','Received')),
  category TEXT,
  account_code TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_locations (
  id TEXT primary key,
  product_id TEXT references products(id) on delete cascade,
  warehouse_id TEXT references warehouses(id) on delete cascade,
  qty INTEGER default 0
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id TEXT primary key,
  transfer_no TEXT,
  from_wh TEXT references warehouses(id),
  to_wh TEXT references warehouses(id),
  product_id TEXT references products(id),
  product_name TEXT,
  qty INTEGER not null,
  status TEXT default 'Requested' check (status in ('Requested','Dispatched','Received','Cancelled')),
  requested_by TEXT,
  dispatched_by TEXT,
  received_by TEXT,
  requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TEXT,
  received_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id TEXT primary key,
  transfer_id TEXT references stock_transfers(id) on delete cascade,
  product_id TEXT references products(id),
  product_name TEXT,
  qty INTEGER not null,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS bom_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  output_product_id TEXT REFERENCES products(id),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS bom_template_items (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES bom_templates(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  qty REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bom_template_costs (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES bom_templates(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id),
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY,
  prod_no TEXT,
  template_id TEXT REFERENCES bom_templates(id),
  output_product_id TEXT REFERENCES products(id),
  qty REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  prod_date TEXT DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  built_at TEXT,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS production_components (
  id TEXT PRIMARY KEY,
  production_id TEXT REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  qty REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS production_costs (
  id TEXT PRIMARY KEY,
  production_id TEXT REFERENCES production_orders(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id),
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS pdc_cheques (
  id TEXT PRIMARY KEY,
  direction TEXT,
  cheque_no TEXT,
  cheque_date TEXT,
  amount REAL DEFAULT 0,
  party_name TEXT,
  party_id TEXT,
  bank TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  purchase_date TEXT,
  cost REAL DEFAULT 0,
  salvage_value REAL DEFAULT 0,
  useful_life REAL DEFAULT 0,
  method TEXT DEFAULT 'Straight-line' CHECK (method IN ('Straight-line','Reducing balance')),
  accumulated_depreciation REAL DEFAULT 0,
  last_dep_date TEXT,
  asset_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS payment_schedules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  invoice_id TEXT,
  invoice_no TEXT,
  customer_name TEXT,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_imports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  filename TEXT,
  bank_account_id TEXT,
  row_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Completed',
  imported_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id TEXT,
  frequency TEXT NOT NULL DEFAULT 'Monthly' CHECK (frequency IN ('Weekly','Bi-Weekly','Monthly','Quarterly','Semi-Annual','Annual')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  next_run_date TEXT NOT NULL,
  last_run_date TEXT,
  run_count INTEGER DEFAULT 0,
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat_percent REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  notes TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Paused','Completed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cheque_templates (
  id TEXT primary key,
  bank_name TEXT not null,
  leaf_w_mm REAL default 215,
  leaf_h_mm REAL default 95,
  bg_url TEXT,
  positions TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT primary key,
  doc_type TEXT not null,
  name TEXT not null,
  layout TEXT not null default '[]',
  header TEXT,
  footer TEXT,
  created_at TEXT not null DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT not null DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_deposits (
  id TEXT PRIMARY KEY,
  deposit_no TEXT UNIQUE,
  deposit_date TEXT DEFAULT CURRENT_DATE,
  description TEXT,
  amount REAL DEFAULT 0,
  bank_account TEXT,
  bank_account_id TEXT REFERENCES accounts(id),
  reference TEXT,
  deposit_type TEXT DEFAULT 'Cash' CHECK (deposit_type IN ('Cash','Cheque','Transfer','PDC')),
  cheques TEXT DEFAULT '[]',
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Deposited','Cleared','Cancelled')),
  reconciled INTEGER DEFAULT 0,
  reconciled_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_serial (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  product_id TEXT,
  batch_no TEXT,
  serial_no TEXT,
  quantity REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  manufacturing_date TEXT,
  expiry_date TEXT,
  warehouse TEXT DEFAULT 'Main',
  status TEXT DEFAULT 'Active',
  reference TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_workflow (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  doc_type TEXT NOT NULL,
  level_no INTEGER NOT NULL DEFAULT 1,
  approver_role TEXT,
  approver_user_id TEXT,
  min_amount REAL DEFAULT 0,
  max_amount REAL DEFAULT 999999999,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  doc_type TEXT NOT NULL,
  doc_id TEXT,
  doc_no TEXT,
  level_no INTEGER,
  approver_name TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  acted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_field_defs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  is_required INTEGER DEFAULT 0,
  default_value TEXT,
  options TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  adjustment_no TEXT UNIQUE,
  product_id TEXT REFERENCES products(id),
  item_name TEXT,
  adjustment_type TEXT DEFAULT 'Positive' CHECK (adjustment_type IN ('Positive','Negative')),
  quantity INTEGER DEFAULT 0,
  adjustment_date TEXT DEFAULT CURRENT_DATE,
  reason TEXT,
  warehouse TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  movement_no TEXT UNIQUE,
  product_id TEXT REFERENCES products(id),
  item_name TEXT,
  movement_type TEXT DEFAULT 'In' CHECK (movement_type IN ('In','Out')),
  quantity INTEGER DEFAULT 0,
  warehouse TEXT,
  reference TEXT,
  movement_date TEXT DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS physical_stock (
  id TEXT PRIMARY KEY,
  count_no TEXT UNIQUE,
  product_id TEXT REFERENCES products(id),
  item_name TEXT,
  system_qty INTEGER DEFAULT 0,
  counted_qty INTEGER DEFAULT 0,
  variance INTEGER DEFAULT 0,
  count_date TEXT DEFAULT CURRENT_DATE,
  warehouse TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  alert_type TEXT NOT NULL DEFAULT 'low_stock',
  current_qty REAL DEFAULT 0,
  reorder_level REAL DEFAULT 0,
  warehouse TEXT,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  email_sent INTEGER DEFAULT 0,
  email_sent_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
