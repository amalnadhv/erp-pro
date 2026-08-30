-- ============================================================
-- Phase 2: Real tables for all stub modules
-- Run AFTER tenants.sql
-- ============================================================

-- ===== Item Groups =====
CREATE TABLE IF NOT EXISTS item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(30),
  name VARCHAR(255) NOT NULL,
  parent_group VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Warehouses =====
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(30),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  manager VARCHAR(255),
  capacity_units INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Price Lists =====
CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(10) DEFAULT 'AED',
  base_pricelist VARCHAR(255),
  valid_from DATE,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Sales Persons =====
CREATE TABLE IF NOT EXISTS sales_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(30),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  commission_rate DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Leads & Opportunities =====
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  lead_name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(30),
  email VARCHAR(255),
  source VARCHAR(50),
  stage VARCHAR(30) DEFAULT 'New',
  estimated_value DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Sales Targets =====
CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  sales_person VARCHAR(255) NOT NULL,
  fiscal_year INT DEFAULT EXTRACT(YEAR FROM NOW()),
  period VARCHAR(20) DEFAULT 'Monthly',
  target_amount DECIMAL(14,2) DEFAULT 0,
  achieved DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Cost Centers =====
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(30),
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  manager VARCHAR(255),
  annual_budget DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Budgets =====
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  budget_code VARCHAR(30) NOT NULL,
  fiscal_year INT DEFAULT EXTRACT(YEAR FROM NOW()),
  period VARCHAR(20) DEFAULT 'Annual',
  account_name VARCHAR(255),
  amount DECIMAL(14,2) DEFAULT 0,
  spent DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Debit Notes =====
CREATE TABLE IF NOT EXISTS debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  note_no VARCHAR(30) UNIQUE,
  party_name VARCHAR(255),
  party_type VARCHAR(20) DEFAULT 'Customer',
  doc_date DATE DEFAULT CURRENT_DATE,
  amount DECIMAL(14,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Credit Notes =====
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  note_no VARCHAR(30) UNIQUE,
  party_name VARCHAR(255),
  party_type VARCHAR(20) DEFAULT 'Customer',
  doc_date DATE DEFAULT CURRENT_DATE,
  amount DECIMAL(14,2) DEFAULT 0,
  vat_amount DECIMAL(14,2) DEFAULT 0,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Batch / Serial Numbers =====
CREATE TABLE IF NOT EXISTS batch_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  batch_no VARCHAR(50) NOT NULL,
  item_name VARCHAR(255),
  product_id UUID REFERENCES products(id),
  quantity INT DEFAULT 0,
  expiry_date DATE,
  serial_range TEXT,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Pick & Pack =====
CREATE TABLE IF NOT EXISTS pick_pack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  pick_no VARCHAR(30) UNIQUE,
  order_ref VARCHAR(50),
  customer_name VARCHAR(255),
  pick_date DATE DEFAULT CURRENT_DATE,
  items JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Barcode Management =====
CREATE TABLE IF NOT EXISTS barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  barcode VARCHAR(100) UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  uom VARCHAR(30) DEFAULT 'PC',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Petty Cash =====
CREATE TABLE IF NOT EXISTS petty_cash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  voucher_no VARCHAR(30) UNIQUE,
  doc_date DATE DEFAULT CURRENT_DATE,
  payee VARCHAR(255),
  description TEXT,
  amount DECIMAL(14,2) DEFAULT 0,
  type VARCHAR(20) DEFAULT 'Expense' CHECK (type IN ('Expense','Received')),
  category VARCHAR(100),
  account_code VARCHAR(30),
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Add tenant_id to existing warehouses (stock_transfer.sql) =====
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_item_groups_tenant ON item_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_tenant ON price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_persons_tenant ON sales_persons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_tenant ON sales_targets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_tenant ON cost_centers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_tenant ON debit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant ON credit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batch_serials_tenant ON batch_serials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pick_pack_tenant ON pick_pack(tenant_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_tenant ON barcodes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_tenant ON petty_cash(tenant_id);

-- ===== RLS Policies =====
ALTER TABLE item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_pack ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'item_groups','price_lists','sales_persons','leads','sales_targets',
    'cost_centers','budgets','debit_notes','credit_notes',
    'batch_serials','pick_pack','barcodes','petty_cash'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (tenant_id = public.user_tenant_id() OR public.user_tenant_id() IS NULL)', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (tenant_id = public.user_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (tenant_id = public.user_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (tenant_id = public.user_tenant_id())', tbl);
  END LOOP;
END $$;

-- ===== Auto-generate voucher numbers for Debit/Credit Notes =====
CREATE OR REPLACE FUNCTION set_debit_note_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.note_no IS NULL OR NEW.note_no = '' THEN
    NEW.note_no := 'DN-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_debit_note_no BEFORE INSERT ON debit_notes FOR EACH ROW EXECUTE FUNCTION set_debit_note_no();

CREATE OR REPLACE FUNCTION set_credit_note_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.note_no IS NULL OR NEW.note_no = '' THEN
    NEW.note_no := 'CN-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credit_note_no BEFORE INSERT ON credit_notes FOR EACH ROW EXECUTE FUNCTION set_credit_note_no();

CREATE OR REPLACE FUNCTION set_petty_cash_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voucher_no IS NULL OR NEW.voucher_no = '' THEN
    NEW.voucher_no := 'PC-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_petty_cash_no BEFORE INSERT ON petty_cash FOR EACH ROW EXECUTE FUNCTION set_petty_cash_no();
