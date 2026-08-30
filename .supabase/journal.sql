-- ============================================================
-- JOURNAL ENTRIES
-- Run this AFTER setup.sql and accounts.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_no      TEXT NOT NULL UNIQUE,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference     TEXT DEFAULT '',
  narration     TEXT DEFAULT '',
  status        TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Posted','Void')),
  total_debit   NUMERIC(15,2) DEFAULT 0,
  total_credit  NUMERIC(15,2) DEFAULT 0,
  currency      TEXT DEFAULT 'AED',
  created_by    TEXT DEFAULT 'Admin',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id      UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_no       INTEGER NOT NULL,
  account_id    UUID NOT NULL REFERENCES accounts(id),
  debit         NUMERIC(15,2) DEFAULT 0,
  credit        NUMERIC(15,2) DEFAULT 0,
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_jl_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_journal_entries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entries_updated ON journal_entries;
CREATE TRIGGER journal_entries_updated
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_journal_entries_timestamp();

-- Auto-number trigger
CREATE OR REPLACE FUNCTION set_journal_entry_no()
RETURNS TRIGGER AS $$
DECLARE
  next_no INTEGER;
BEGIN
  IF NEW.entry_no IS NULL OR NEW.entry_no = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_no FROM 4) AS INTEGER)), 0) + 1
    INTO next_no FROM journal_entries;
    NEW.entry_no := 'JE-' || LPAD(next_no::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS je_autonumber ON journal_entries;
CREATE TRIGGER je_autonumber
  BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION set_journal_entry_no();
