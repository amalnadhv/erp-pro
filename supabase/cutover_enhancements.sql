-- Cutover enhancements: proper date / party linking on invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS due_date DATE;

-- Backfill invoice_date from created_at where missing (one-time)
UPDATE invoices SET invoice_date = created_at::date WHERE invoice_date IS NULL;
