-- ============================================================
-- Purchase Pipeline: Reference columns for conversion chain
-- PR → PO → GRN → AP Invoice
-- Run AFTER schema.sql
-- ============================================================

-- Add source document reference columns
ALTER TABLE purchase_orders    ADD COLUMN IF NOT EXISTS source_doc_id UUID;
ALTER TABLE purchase_orders    ADD COLUMN IF NOT EXISTS source_doc_no VARCHAR(30);
ALTER TABLE goods_receipts     ADD COLUMN IF NOT EXISTS source_doc_id UUID;
ALTER TABLE goods_receipts     ADD COLUMN IF NOT EXISTS source_doc_no VARCHAR(30);
ALTER TABLE purchase_invoices  ADD COLUMN IF NOT EXISTS source_doc_id UUID;
ALTER TABLE purchase_invoices  ADD COLUMN IF NOT EXISTS source_doc_no VARCHAR(30);

-- Add due_date to purchase_invoices if not exists (already in cutover_enhancements.sql)
-- ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add landed cost allocation columns
ALTER TABLE landed_costs ADD COLUMN IF NOT EXISTS allocated_to JSONB DEFAULT '[]'::jsonb;
ALTER TABLE landed_costs ADD COLUMN IF NOT EXISTS cost_type VARCHAR(50) DEFAULT 'Freight';

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_purchase_orders_source ON purchase_orders(source_doc_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_source ON goods_receipts(source_doc_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_source ON purchase_invoices(source_doc_id);
