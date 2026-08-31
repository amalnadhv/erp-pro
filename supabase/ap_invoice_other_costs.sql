-- Add other_costs columns to purchase_invoices for customs, demurrage, freight, etc.
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS other_costs DECIMAL(14,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS other_cost_desc TEXT;

-- Add GRN link and cost_lines to landed_costs
ALTER TABLE landed_costs ADD COLUMN IF NOT EXISTS grn_id UUID REFERENCES goods_receipts(id);
ALTER TABLE landed_costs ADD COLUMN IF NOT EXISTS grn_no VARCHAR(30);
ALTER TABLE landed_costs ADD COLUMN IF NOT EXISTS cost_lines JSONB DEFAULT '[]'::jsonb;
