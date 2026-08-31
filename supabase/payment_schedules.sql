-- Payment Schedule table
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  invoice_id UUID,
  invoice_no VARCHAR(50),
  customer_name VARCHAR(255),
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_schedules_tenant_isolation" ON payment_schedules FOR ALL USING (tenant_id = get_tenant_id());
CREATE INDEX idx_payment_schedules_invoice ON payment_schedules(invoice_id);
CREATE INDEX idx_payment_schedules_due ON payment_schedules(due_date);

-- Bank Reconciliation enhancements: store CSV import tracking
CREATE TABLE IF NOT EXISTS bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  filename VARCHAR(255),
  bank_account_id UUID REFERENCES accounts(id),
  row_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Completed',
  imported_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bank_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_imports_tenant_isolation" ON bank_imports FOR ALL USING (tenant_id = get_tenant_id());
