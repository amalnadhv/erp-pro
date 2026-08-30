-- ============================================================
-- Production / Bill of Materials (Assembly + Subcontract)
-- ============================================================

-- Reusable BOM templates (recipe: output product + components + cost heads)
CREATE TABLE IF NOT EXISTS bom_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  output_product_id uuid REFERENCES products(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bom_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES bom_templates(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  qty numeric NOT NULL DEFAULT 0          -- quantity per 1 finished unit
);

CREATE TABLE IF NOT EXISTS bom_template_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES bom_templates(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id),
  amount numeric NOT NULL DEFAULT 0,        -- cost per 1 finished unit
  description text
);

-- Production orders (a build of a template)
CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prod_no text,
  template_id uuid REFERENCES bom_templates(id),
  output_product_id uuid REFERENCES products(id),
  qty numeric NOT NULL DEFAULT 0,          -- finished units to produce
  status text NOT NULL DEFAULT 'Draft',    -- Draft | Sent | Received | Built | Cancelled
  prod_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  built_at timestamptz
);

-- Snapshot of components for the order (so history is stable if template changes)
CREATE TABLE IF NOT EXISTS production_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  qty numeric NOT NULL DEFAULT 0           -- total qty consumed for this order
);

-- Snapshot of cost heads for the order
CREATE TABLE IF NOT EXISTS production_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id),
  amount numeric NOT NULL DEFAULT 0,
  description text
);

CREATE INDEX IF NOT EXISTS idx_bom_template_items_tmpl ON bom_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_bom_template_costs_tmpl ON bom_template_costs(template_id);
CREATE INDEX IF NOT EXISTS idx_prod_comp_prod ON production_components(production_id);
CREATE INDEX IF NOT EXISTS idx_prod_cost_prod ON production_costs(production_id);

-- Row Level Security (app uses a privileged anon key; policies kept permissive)
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_template_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_costs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bom_templates','bom_template_items','bom_template_costs','production_orders','production_components','production_costs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_policy', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true);', t || '_policy', t);
  END LOOP;
END $$;
