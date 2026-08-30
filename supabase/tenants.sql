-- ============================================================
-- SaaS Tenant + Credit System
-- Run AFTER schema.sql, features.sql, stock_transfer.sql,
-- production.sql, pdc.sql, doc_numbering_unified.sql
-- ============================================================

-- ===== 0. AUTO-CONFIRM EMAILS (bypass email verification) =====
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
  NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();

-- ===== 1. BILLING PLANS =====
CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  monthly_price DECIMAL(12,2) DEFAULT 0,
  max_users INT DEFAULT 5,
  max_storage_mb INT DEFAULT 5120,
  max_transactions INT DEFAULT 5000,
  features JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO billing_plans (name, credit_amount, monthly_price, max_users, max_storage_mb, max_transactions, features) VALUES
  ('Starter',   100.00, 0,     3,  1024,  2000, '{"modules":"basic"}'),
  ('Standard',  0,     49.00, 10,  5120, 10000, '{"modules":"standard","priority_support":true}'),
  ('Enterprise', 0,    149.00, 50, 20480, 50000, '{"modules":"all","api_access":true,"priority_support":true}')
ON CONFLICT (name) DO NOTHING;

-- ===== 2. TENANTS =====
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan_name VARCHAR(50) DEFAULT 'Starter',
  credit_balance DECIMAL(12,2) DEFAULT 100.00,
  credit_used DECIMAL(12,2) DEFAULT 0,
  credit_initial DECIMAL(12,2) DEFAULT 100.00,
  currency VARCHAR(10) DEFAULT 'AED',
  expires_at DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Suspended','Cancelled')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 3. TENANT USERS =====
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(30) DEFAULT 'Viewer' CHECK (role IN ('Owner','Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer')),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- ===== 4. CREDIT TRANSACTIONS =====
CREATE TABLE IF NOT EXISTS tenant_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  tx_type VARCHAR(30) NOT NULL CHECK (tx_type IN ('Credit','Debit','Refund','Bonus','Expiry')),
  description TEXT,
  module VARCHAR(50),
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 5. USAGE METERING =====
CREATE TABLE IF NOT EXISTS usage_metering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_month VARCHAR(7) NOT NULL,  -- '2026-08'
  storage_mb DECIMAL(10,2) DEFAULT 0,
  user_count INT DEFAULT 0,
  transaction_count INT DEFAULT 0,
  api_calls INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_month)
);

-- ===== 6. PAYMENT METHODS (Stripe refs) =====
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_pm_id VARCHAR(100),
  brand VARCHAR(30),
  last4 VARCHAR(4),
  exp_month INT,
  exp_year INT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 7. TENANT INVOICES =====
CREATE TABLE IF NOT EXISTS tenant_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft','Pending','Paid','Failed','Void')),
  description TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 8. Add tenant_id to key tables =====
ALTER TABLE accounts           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE products           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE customers          ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE suppliers          ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE invoices           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE purchase_invoices  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE journal_entries    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE journal_lines      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE incoming_payments  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE outgoing_payments  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sales_quotations   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sales_orders       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE delivery_notes     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE ar_credit_memos    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sales_returns      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE purchase_orders    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE goods_receipts     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE ap_credit_memos    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE purchase_returns   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE landed_costs       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE pdc_cheques        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE fixed_assets       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE doc_numbering      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE cheque_templates   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE activity_log       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE attachments        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE exchange_rates     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE bank_reconciliation ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE bank_recon_lines   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE payment_batches    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE batch_lines        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE stock_transfers    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE stock_transfer_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE production_orders  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE production_components ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE production_costs   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE bom_templates      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ===== 9. Performance indexes =====
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_credits_tenant ON tenant_credits(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_metering_tenant ON usage_metering(tenant_id, period_month);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant ON purchase_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);

-- ===== 10. Credit deduction function =====
CREATE OR REPLACE FUNCTION deduct_credit(
  p_tenant_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_module TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT credit_balance INTO v_balance FROM tenants WHERE id = p_tenant_id;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  UPDATE tenants SET
    credit_balance = credit_balance - p_amount,
    credit_used = credit_used + p_amount,
    updated_at = NOW()
  WHERE id = p_tenant_id;
  INSERT INTO tenant_credits (tenant_id, amount, balance_after, tx_type, description, module, ref_id)
  VALUES (p_tenant_id, -p_amount, v_balance - p_amount, 'Debit', p_description, p_module, p_ref_id);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===== 11. Check credit function =====
CREATE OR REPLACE FUNCTION check_credit(p_tenant_id UUID)
RETURNS TABLE(has_credit BOOLEAN, balance DECIMAL, plan_name TEXT, max_transactions INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.credit_balance > 0,
    t.credit_balance,
    t.plan_name,
    COALESCE(bp.max_transactions, 5000)
  FROM tenants t
  LEFT JOIN billing_plans bp ON bp.name = t.plan_name
  WHERE t.id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ===== 12. RLS Policies =====
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metering ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE landed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdc_cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_numbering ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheque_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_recon_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION public.user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'Active' LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ===== Tenant-scoped RLS policies =====
-- For every table with tenant_id, create a policy:
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'accounts','products','customers','suppliers','invoices','purchase_invoices',
      'journal_entries','journal_lines','incoming_payments','outgoing_payments',
      'sales_quotations','sales_orders','delivery_notes','ar_credit_memos',
      'sales_returns','purchase_requisitions','purchase_orders','goods_receipts',
      'ap_credit_memos','purchase_returns','landed_costs','pdc_cheques',
      'fixed_assets','doc_numbering','cheque_templates','activity_log',
      'attachments','bank_reconciliation','bank_recon_lines',
      'payment_batches','batch_lines','stock_transfers','stock_transfer_items',
      'production_orders','production_components','production_costs','bom_templates'
    ])
  LOOP
    -- Drop existing policies first (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I', tbl);
    -- Create fresh policies
    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (tenant_id = public.user_tenant_id() OR public.user_tenant_id() IS NULL)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (tenant_id = public.user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (tenant_id = public.user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (tenant_id = public.user_tenant_id())',
      tbl
    );
  END LOOP;
END $$;

-- Tenants table: users can only see their own tenant
DROP POLICY IF EXISTS tenant_self_select ON tenants;
CREATE POLICY tenant_self_select ON tenants FOR SELECT
  USING (id = public.user_tenant_id() OR public.user_tenant_id() IS NULL);

-- Tenant users: can see users in same tenant
DROP POLICY IF EXISTS tenant_users_select ON tenant_users;
CREATE POLICY tenant_users_select ON tenant_users FOR SELECT
  USING (tenant_id = public.user_tenant_id() OR public.user_tenant_id() IS NULL);

DROP POLICY IF EXISTS tenant_users_insert ON tenant_users;
CREATE POLICY tenant_users_insert ON tenant_users FOR INSERT
  WITH CHECK (tenant_id = public.user_tenant_id());

-- Credit log: tenant-scoped
DROP POLICY IF EXISTS tenant_credits_select ON tenant_credits;
CREATE POLICY tenant_credits_select ON tenant_credits FOR SELECT
  USING (tenant_id = public.user_tenant_id() OR public.user_tenant_id() IS NULL);

-- Usage: tenant-scoped
DROP POLICY IF EXISTS usage_select ON usage_metering;
CREATE POLICY usage_select ON usage_metering FOR SELECT
  USING (tenant_id = public.user_tenant_id() OR public.user_tenant_id() IS NULL);
