-- ===== Activity / Audit Trail =====
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text,
  entity text,
  entity_id text,
  detail text,
  user_email text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log (created_at DESC);

-- ===== Inventory valuation method on products =====
ALTER TABLE products ADD COLUMN IF NOT EXISTS valuation_method text DEFAULT 'Weighted Average';
