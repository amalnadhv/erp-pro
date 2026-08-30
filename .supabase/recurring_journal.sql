-- ============================================================
-- RECURRING JOURNAL ENTRIES
-- Run this AFTER journal.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_journal (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name   TEXT NOT NULL,
  reference       TEXT DEFAULT '',
  narration       TEXT DEFAULT '',
  frequency       TEXT NOT NULL CHECK (frequency IN ('Weekly','Bi-Weekly','Monthly','Quarterly','Semi-Annual','Annual')),
  start_date      DATE NOT NULL,
  end_date        DATE,
  next_run_date   DATE NOT NULL,
  currency        TEXT DEFAULT 'AED',
  status          TEXT DEFAULT 'Active' CHECK (status IN ('Active','Paused','Completed')),
  last_run_date   DATE,
  run_count       INTEGER DEFAULT 0,
  created_by      TEXT DEFAULT 'Admin',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_journal_lines (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_id    UUID NOT NULL REFERENCES recurring_journal(id) ON DELETE CASCADE,
  line_no         INTEGER NOT NULL,
  account_id      UUID NOT NULL REFERENCES accounts(id),
  debit           NUMERIC(15,2) DEFAULT 0,
  credit          NUMERIC(15,2) DEFAULT 0,
  description     TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_rj_next_run ON recurring_journal(next_run_date);
CREATE INDEX IF NOT EXISTS idx_rj_status ON recurring_journal(status);
CREATE INDEX IF NOT EXISTS idx_rjl_recurring ON recurring_journal_lines(recurring_id);

CREATE OR REPLACE FUNCTION update_recurring_journal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recurring_journal_updated ON recurring_journal;
CREATE TRIGGER recurring_journal_updated
  BEFORE UPDATE ON recurring_journal
  FOR EACH ROW EXECUTE FUNCTION update_recurring_journal_timestamp();
