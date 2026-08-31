-- Recurring Invoices table
-- Auto-generates invoices on a schedule (monthly, quarterly, etc.)

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id UUID,
  frequency TEXT NOT NULL DEFAULT 'Monthly' CHECK (frequency IN ('Weekly','Bi-Weekly','Monthly','Quarterly','Semi-Annual','Annual')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  run_count INT DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(14,2) DEFAULT 0,
  vat_percent NUMERIC(5,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'AED',
  payment_terms TEXT DEFAULT 'Net 30',
  notes TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Paused','Completed')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ri_next_run ON recurring_invoices(next_run_date);
CREATE INDEX IF NOT EXISTS idx_ri_status ON recurring_invoices(status);

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_recurring_invoices" ON recurring_invoices;
CREATE POLICY "public_all_recurring_invoices" ON recurring_invoices FOR ALL TO anon USING (true) WITH CHECK (true);

-- Function to generate next invoice from a recurring template
CREATE OR REPLACE FUNCTION generate_recurring_invoice(p_recurring_id UUID)
RETURNS UUID AS $$
DECLARE
  rec RECORD;
  new_inv_id UUID;
  new_inv_no TEXT;
BEGIN
  SELECT * INTO rec FROM recurring_invoices WHERE id = p_recurring_id AND status = 'Active';
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Generate invoice number
  new_inv_no := 'RI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(rec.id::TEXT FROM 1 FOR 4);

  -- Insert invoice
  INSERT INTO invoices (
    invoice_no, customer_name, customer_id, items, subtotal, vat_percent, vat_amount,
    grand_total, payment_method, amount_paid, balance, notes, status, invoice_date, due_date
  ) VALUES (
    new_inv_no, rec.customer_name, rec.customer_id, rec.items, rec.subtotal, rec.vat_percent, rec.vat_amount,
    rec.grand_total, 'Bank Transfer', 0, rec.grand_total, rec.notes || ' (Auto-generated from: ' || rec.template_name || ')',
    'Draft', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'
  ) RETURNING id INTO new_inv_id;

  -- Update recurring record
  UPDATE recurring_invoices SET
    last_run_date = CURRENT_DATE,
    run_count = run_count + 1,
    next_run_date = CASE rec.frequency
      WHEN 'Weekly' THEN CURRENT_DATE + INTERVAL '7 days'
      WHEN 'Bi-Weekly' THEN CURRENT_DATE + INTERVAL '14 days'
      WHEN 'Monthly' THEN CURRENT_DATE + INTERVAL '1 month'
      WHEN 'Quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
      WHEN 'Semi-Annual' THEN CURRENT_DATE + INTERVAL '6 months'
      WHEN 'Annual' THEN CURRENT_DATE + INTERVAL '1 year'
    END,
    status = CASE WHEN rec.end_date IS NOT NULL AND CURRENT_DATE >= rec.end_date THEN 'Completed' ELSE 'Active' END,
    updated_at = NOW()
  WHERE id = p_recurring_id;

  RETURN new_inv_id;
END;
$$ LANGUAGE plpgsql;
