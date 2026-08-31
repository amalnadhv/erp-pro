-- Batch / Serial Tracking
CREATE TABLE IF NOT EXISTS batch_serial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  product_id UUID,
  batch_no VARCHAR(100),
  serial_no VARCHAR(100),
  quantity NUMERIC(12,2) DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  manufacturing_date DATE,
  expiry_date DATE,
  warehouse VARCHAR(100) DEFAULT 'Main',
  status VARCHAR(20) DEFAULT 'Active',
  reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE batch_serial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batch_serial_all" ON batch_serial FOR ALL USING (true);
CREATE INDEX idx_batch_serial_product ON batch_serial(product_id);
CREATE INDEX idx_batch_serial_batch ON batch_serial(batch_no);
CREATE INDEX idx_batch_serial_serial ON batch_serial(serial_no);

-- Stock Rotation Method (per product or global)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_method VARCHAR(20) DEFAULT 'FIFO';

-- Approval Workflow
CREATE TABLE IF NOT EXISTS approval_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  doc_type VARCHAR(50) NOT NULL,
  level_no INTEGER NOT NULL DEFAULT 1,
  approver_role VARCHAR(100),
  approver_user_id UUID,
  min_amount DECIMAL(12,2) DEFAULT 0,
  max_amount DECIMAL(12,2) DEFAULT 999999999,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE approval_workflow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_workflow_all" ON approval_workflow FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  doc_type VARCHAR(50) NOT NULL,
  doc_id UUID,
  doc_no VARCHAR(50),
  level_no INTEGER,
  approver_name VARCHAR(255),
  action VARCHAR(20) NOT NULL,
  reason TEXT,
  acted_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_logs_all" ON approval_logs FOR ALL USING (true);

-- Custom Fields Definition
CREATE TABLE IF NOT EXISTS custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  entity_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(100) NOT NULL,
  field_type VARCHAR(30) DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  options TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE custom_field_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_field_defs_all" ON custom_field_defs FOR ALL USING (true);

-- Custom Field Values
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_field_values_all" ON custom_field_values FOR ALL USING (true);
CREATE UNIQUE INDEX idx_cfv_unique ON custom_field_values(entity_type, entity_id, field_name);
