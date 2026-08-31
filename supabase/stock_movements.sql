-- ============================================================
-- Stock Movement Tables: Stock Adjustment, Stock In/Out, Physical Stock
-- Run AFTER modules.sql and schema.sql
-- ============================================================

-- ===== Stock Adjustments =====
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_no VARCHAR(30) UNIQUE,
  product_id UUID REFERENCES products(id),
  item_name VARCHAR(255),
  adjustment_type VARCHAR(20) DEFAULT 'Positive' CHECK (adjustment_type IN ('Positive','Negative')),
  quantity INT DEFAULT 0,
  adjustment_date DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  warehouse VARCHAR(255),
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Stock In/Out =====
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_no VARCHAR(30) UNIQUE,
  product_id UUID REFERENCES products(id),
  item_name VARCHAR(255),
  movement_type VARCHAR(10) DEFAULT 'In' CHECK (movement_type IN ('In','Out')),
  quantity INT DEFAULT 0,
  warehouse VARCHAR(255),
  reference TEXT,
  movement_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Physical Stock Count =====
CREATE TABLE IF NOT EXISTS physical_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_no VARCHAR(30) UNIQUE,
  product_id UUID REFERENCES products(id),
  item_name VARCHAR(255),
  system_qty INT DEFAULT 0,
  counted_qty INT DEFAULT 0,
  variance INT DEFAULT 0,
  count_date DATE DEFAULT CURRENT_DATE,
  warehouse VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Auto-numbering triggers =====
CREATE OR REPLACE FUNCTION set_stock_doc_no()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'stock_adjustments' AND (NEW.adjustment_no IS NULL OR NEW.adjustment_no = '') THEN
    NEW.adjustment_no := 'SADJ-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'stock_movements' AND (NEW.movement_no IS NULL OR NEW.movement_no = '') THEN
    NEW.movement_no := 'SMV-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  ELSIF TG_TABLE_NAME = 'physical_stock' AND (NEW.count_no IS NULL OR NEW.count_no = '') THEN
    NEW.count_no := 'PSC-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_stock_adj_no ON stock_adjustments;
CREATE TRIGGER trg_set_stock_adj_no BEFORE INSERT ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION set_stock_doc_no();

DROP TRIGGER IF EXISTS trg_set_stock_mv_no ON stock_movements;
CREATE TRIGGER trg_set_stock_mv_no BEFORE INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION set_stock_doc_no();

DROP TRIGGER IF EXISTS trg_set_physical_stock_no ON physical_stock;
CREATE TRIGGER trg_set_physical_stock_no BEFORE INSERT ON physical_stock FOR EACH ROW EXECUTE FUNCTION set_stock_doc_no();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_status ON stock_movements(status);
CREATE INDEX IF NOT EXISTS idx_physical_stock_product ON physical_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_physical_stock_status ON physical_stock(status);
