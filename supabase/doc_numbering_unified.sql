-- ============================================================
-- UNIFIED DOCUMENT NUMBERING
-- Replaces the per-table random/independent generators with a
-- single atomic sequence driven by the doc_numbering table
-- (the one editable in Administration -> Document Numbering).
--
-- RUN ORDER: after schema.sql AND after stock_transfer.sql,
-- production.sql and pdc.sql (the tables must exist).
-- Safe to re-run (uses CREATE OR REPLACE / ON CONFLICT DO NOTHING).
-- ============================================================

-- 1) Atomic next-number generator (reads + increments doc_numbering)
CREATE OR REPLACE FUNCTION next_doc_no(p_type text)
RETURNS text AS $$
DECLARE
  r record;
  v_fmt text;
BEGIN
  UPDATE doc_numbering
  SET next_number = next_number + 1
  WHERE doc_type = p_type
  RETURNING next_number, prefix, pad_length, separator, suffix
  INTO r;

  IF r IS NULL THEN
    -- no sequence row yet: create a sane default on the fly
    INSERT INTO doc_numbering (doc_type, prefix, next_number, pad_length, separator)
    VALUES (p_type, UPPER(LEFT(regexp_replace(p_type, '[^A-Za-z]', '', 'g'), 3)), 2, 5, '-')
    ON CONFLICT (doc_type) DO UPDATE SET next_number = doc_numbering.next_number + 1
    RETURNING next_number, prefix, pad_length, separator, suffix
    INTO r;
  END IF;

  v_fmt := COALESCE(r.prefix, '') || COALESCE(r.separator, '-') ||
           LPAD(r.next_number::text, GREATEST(r.pad_length, 1), '0') ||
           COALESCE(r.suffix, '');
  RETURN v_fmt;
END;
$$ LANGUAGE plpgsql;

-- 2) Seed every document type (keeps existing ones; adds the rest)
INSERT INTO doc_numbering (doc_type, prefix, next_number, pad_length, separator) VALUES
  ('Purchase Invoice',      'PIN', 1, 5, '-'),
  ('Sales Quotation',       'SQ',  1, 5, '-'),
  ('Sales Order',           'SO',  1, 5, '-'),
  ('Delivery Note',         'DN',  1, 5, '-'),
  ('AR Credit Memo',        'ACR', 1, 5, '-'),
  ('AP Credit Memo',        'APC', 1, 5, '-'),
  ('Sales Return',          'SR',  1, 5, '-'),
  ('Purchase Return',       'PRT', 1, 5, '-'),
  ('Purchase Requisition',  'REQ', 1, 5, '-'),
  ('Goods Receipt',         'GRN', 1, 5, '-'),
  ('Landed Cost',           'LC',  1, 5, '-'),
  ('Stock Transfer',        'TRF', 1, 5, '-'),
  ('Production Order',      'BOM', 1, 5, '-'),   -- BOM (not PRD, to avoid clash with Product)
  ('PDC Cheque',            'PDC', 1, 5, '-')
ON CONFLICT (doc_type) DO NOTHING;

-- 3) Sales Invoice
CREATE OR REPLACE FUNCTION set_invoice_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := next_doc_no('Sales Invoice');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_invoice_no ON invoices;
CREATE TRIGGER trg_set_invoice_no BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_no();

-- 4) Journal Entry
CREATE OR REPLACE FUNCTION set_journal_entry_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_no IS NULL OR NEW.entry_no = '' THEN
    NEW.entry_no := next_doc_no('Journal Entry');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS je_autonumber ON journal_entries;
CREATE TRIGGER je_autonumber BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION set_journal_entry_no();

-- 5) Payments
CREATE OR REPLACE FUNCTION set_incoming_payment_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_no IS NULL OR NEW.payment_no = '' THEN
    NEW.payment_no := next_doc_no('Incoming Payment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_incoming_payment_no ON incoming_payments;
CREATE TRIGGER set_incoming_payment_no BEFORE INSERT ON incoming_payments
  FOR EACH ROW EXECUTE FUNCTION set_incoming_payment_no();

CREATE OR REPLACE FUNCTION set_outgoing_payment_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_no IS NULL OR NEW.payment_no = '' THEN
    NEW.payment_no := next_doc_no('Outgoing Payment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_outgoing_payment_no ON outgoing_payments;
CREATE TRIGGER set_outgoing_payment_no BEFORE INSERT ON outgoing_payments
  FOR EACH ROW EXECUTE FUNCTION set_outgoing_payment_no();

-- 6) Quotation / Sales Order
CREATE OR REPLACE FUNCTION set_quote_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_no IS NULL OR NEW.quote_no = '' THEN
    NEW.quote_no := next_doc_no('Sales Quotation');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_quote_no ON sales_quotations;
CREATE TRIGGER trg_set_quote_no BEFORE INSERT ON sales_quotations
  FOR EACH ROW EXECUTE FUNCTION set_quote_no();

CREATE OR REPLACE FUNCTION set_so_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no := next_doc_no('Sales Order');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_so_no ON sales_orders;
CREATE TRIGGER trg_set_so_no BEFORE INSERT ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION set_so_no();

-- 7) External doc tables (delivery, memos, returns, req, PO, GRN, PIN, LC)
CREATE OR REPLACE FUNCTION set_ext_doc_no() RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'delivery_notes' THEN
    IF NEW.delivery_no IS NULL OR NEW.delivery_no = '' THEN NEW.delivery_no := next_doc_no('Delivery Note'); END IF;
  ELSIF TG_TABLE_NAME = 'ar_credit_memos' THEN
    IF NEW.memo_no IS NULL OR NEW.memo_no = '' THEN NEW.memo_no := next_doc_no('AR Credit Memo'); END IF;
  ELSIF TG_TABLE_NAME = 'ap_credit_memos' THEN
    IF NEW.memo_no IS NULL OR NEW.memo_no = '' THEN NEW.memo_no := next_doc_no('AP Credit Memo'); END IF;
  ELSIF TG_TABLE_NAME = 'sales_returns' THEN
    IF NEW.return_no IS NULL OR NEW.return_no = '' THEN NEW.return_no := next_doc_no('Sales Return'); END IF;
  ELSIF TG_TABLE_NAME = 'purchase_returns' THEN
    IF NEW.return_no IS NULL OR NEW.return_no = '' THEN NEW.return_no := next_doc_no('Purchase Return'); END IF;
  ELSIF TG_TABLE_NAME = 'purchase_requisitions' THEN
    IF NEW.req_no IS NULL OR NEW.req_no = '' THEN NEW.req_no := next_doc_no('Purchase Requisition'); END IF;
  ELSIF TG_TABLE_NAME = 'purchase_orders' THEN
    IF NEW.po_no IS NULL OR NEW.po_no = '' THEN NEW.po_no := next_doc_no('Purchase Order'); END IF;
  ELSIF TG_TABLE_NAME = 'goods_receipts' THEN
    IF NEW.grn_no IS NULL OR NEW.grn_no = '' THEN NEW.grn_no := next_doc_no('Goods Receipt'); END IF;
  ELSIF TG_TABLE_NAME = 'purchase_invoices' THEN
    IF NEW.pin_no IS NULL OR NEW.pin_no = '' THEN NEW.pin_no := next_doc_no('Purchase Invoice'); END IF;
  ELSIF TG_TABLE_NAME = 'landed_costs' THEN
    IF NEW.lc_no IS NULL OR NEW.lc_no = '' THEN NEW.lc_no := next_doc_no('Landed Cost'); END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_delivery ON delivery_notes;
CREATE TRIGGER trg_set_ext_doc_no_delivery BEFORE INSERT ON delivery_notes FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_ar_memo ON ar_credit_memos;
CREATE TRIGGER trg_set_ext_doc_no_ar_memo BEFORE INSERT ON ar_credit_memos FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_ap_memo ON ap_credit_memos;
CREATE TRIGGER trg_set_ext_doc_no_ap_memo BEFORE INSERT ON ap_credit_memos FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_sales_return ON sales_returns;
CREATE TRIGGER trg_set_ext_doc_no_sales_return BEFORE INSERT ON sales_returns FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_purchase_return ON purchase_returns;
CREATE TRIGGER trg_set_ext_doc_no_purchase_return BEFORE INSERT ON purchase_returns FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_req ON purchase_requisitions;
CREATE TRIGGER trg_set_ext_doc_no_req BEFORE INSERT ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_po ON purchase_orders;
CREATE TRIGGER trg_set_ext_doc_no_po BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_grn ON goods_receipts;
CREATE TRIGGER trg_set_ext_doc_no_grn BEFORE INSERT ON goods_receipts FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_pin ON purchase_invoices;
CREATE TRIGGER trg_set_ext_doc_no_pin BEFORE INSERT ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();
DROP TRIGGER IF EXISTS trg_set_ext_doc_no_lc ON landed_costs;
CREATE TRIGGER trg_set_ext_doc_no_lc BEFORE INSERT ON landed_costs FOR EACH ROW EXECUTE FUNCTION set_ext_doc_no();

-- 8) New tables: Stock Transfer, Production Order, PDC Cheque
CREATE OR REPLACE FUNCTION set_transfer_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_no IS NULL OR NEW.transfer_no = '' THEN
    NEW.transfer_no := next_doc_no('Stock Transfer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_transfer_no ON stock_transfers;
CREATE TRIGGER trg_set_transfer_no BEFORE INSERT ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION set_transfer_no();

CREATE OR REPLACE FUNCTION set_production_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prod_no IS NULL OR NEW.prod_no = '' THEN
    NEW.prod_no := next_doc_no('Production Order');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_production_no ON production_orders;
CREATE TRIGGER trg_set_production_no BEFORE INSERT ON production_orders
  FOR EACH ROW EXECUTE FUNCTION set_production_no();

CREATE OR REPLACE FUNCTION set_pdc_cheque_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cheque_no IS NULL OR NEW.cheque_no = '' THEN
    NEW.cheque_no := next_doc_no('PDC Cheque');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_pdc_cheque_no ON pdc_cheques;
CREATE TRIGGER trg_set_pdc_cheque_no BEFORE INSERT ON pdc_cheques
  FOR EACH ROW EXECUTE FUNCTION set_pdc_cheque_no();
