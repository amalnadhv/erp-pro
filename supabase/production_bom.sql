-- Production / Bill of Materials tables
-- Run this in Supabase SQL Editor

-- BOM Templates (master recipe)
CREATE TABLE IF NOT EXISTS bom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  output_product_id UUID REFERENCES products(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BOM Template Components (raw materials per 1 finished unit)
CREATE TABLE IF NOT EXISTS bom_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BOM Template Cost Heads (labour, overhead per 1 finished unit)
CREATE TABLE IF NOT EXISTS bom_template_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Production Orders
CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prod_no TEXT,
  template_id UUID REFERENCES bom_templates(id),
  output_product_id UUID REFERENCES products(id),
  qty NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Draft',
  prod_date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  built_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate prod_no
CREATE OR REPLACE FUNCTION generate_prod_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prod_no IS NULL OR NEW.prod_no = '' THEN
    NEW.prod_no := 'PROD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(((EXTRACT(EPOCH FROM NOW())::INT) % 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_prod_no ON production_orders;
CREATE TRIGGER trg_generate_prod_no BEFORE INSERT ON production_orders FOR EACH ROW EXECUTE FUNCTION generate_prod_no();

-- Production Order Components (snapshot from BOM template)
CREATE TABLE IF NOT EXISTS production_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Production Order Cost Heads
CREATE TABLE IF NOT EXISTS production_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bom_template_items_template ON bom_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_bom_template_costs_template ON bom_template_costs(template_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_components_production ON production_components(production_id);
CREATE INDEX IF NOT EXISTS idx_production_costs_production ON production_costs(production_id);

-- Row Level Security
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_template_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_costs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bom_templates_policy" ON bom_templates FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "bom_template_items_policy" ON bom_template_items FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "bom_template_costs_policy" ON bom_template_costs FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "production_orders_policy" ON production_orders FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "production_components_policy" ON production_components FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "production_costs_policy" ON production_costs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
