-- Stock Alerts table
-- Tracks low-stock and out-of-stock items, with optional email notification

CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  alert_type TEXT NOT NULL DEFAULT 'low_stock',  -- 'low_stock' or 'out_of_stock'
  current_qty NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  warehouse TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_type ON stock_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_ack ON stock_alerts(acknowledged);

-- RLS
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_stock_alerts" ON stock_alerts;
CREATE POLICY "public_all_stock_alerts" ON stock_alerts FOR ALL TO anon USING (true) WITH CHECK (true);

-- Function to generate stock alerts based on current product levels
CREATE OR REPLACE FUNCTION check_stock_levels()
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_code TEXT,
  current_qty NUMERIC,
  reorder_level NUMERIC,
  alert_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name::TEXT,
    COALESCE(p.code, '')::TEXT,
    COALESCE(p.stock_quantity, 0),
    COALESCE(p.reorder_level, 0),
    CASE
      WHEN COALESCE(p.stock_quantity, 0) <= 0 THEN 'out_of_stock'::TEXT
      WHEN COALESCE(p.stock_quantity, 0) <= COALESCE(p.reorder_level, 0) THEN 'low_stock'::TEXT
      ELSE NULL::TEXT
    END AS alert_type
  FROM products p
  WHERE COALESCE(p.stock_quantity, 0) <= COALESCE(p.reorder_level, 0)
    AND COALESCE(p.reorder_level, 0) > 0;
END;
$$ LANGUAGE plpgsql;
