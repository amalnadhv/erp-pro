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
