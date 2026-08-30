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