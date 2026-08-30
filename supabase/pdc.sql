-- Post-Dated Cheques (PDC) register
CREATE TABLE IF NOT EXISTS pdc_cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text,                 -- Received | Issued
  cheque_no text,
  cheque_date date,
  amount numeric DEFAULT 0,
  party_name text,
  party_id text,
  bank text,
  status text DEFAULT 'Pending',  -- Pending | Cleared | Bounced | Cancelled
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdc_date ON pdc_cheques (cheque_date);

-- Cheque details on payments (so PDCs originate from the payment forms)
ALTER TABLE incoming_payments ADD COLUMN IF NOT EXISTS cheque_no text;
ALTER TABLE incoming_payments ADD COLUMN IF NOT EXISTS cheque_date date;
ALTER TABLE incoming_payments ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE outgoing_payments ADD COLUMN IF NOT EXISTS cheque_no text;
ALTER TABLE outgoing_payments ADD COLUMN IF NOT EXISTS cheque_date date;
ALTER TABLE outgoing_payments ADD COLUMN IF NOT EXISTS supplier_name text;
