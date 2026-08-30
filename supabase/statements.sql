-- Statement of Account email consent / schedule on partners
ALTER TABLE customers ADD COLUMN IF NOT EXISTS stmt_consent boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS stmt_schedule text DEFAULT 'Monthly';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS stmt_consent boolean DEFAULT false;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS stmt_schedule text DEFAULT 'Monthly';
