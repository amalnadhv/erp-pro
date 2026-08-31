-- Document Attachments table + storage bucket
-- Run this in Supabase SQL Editor

-- Attachments metadata table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

-- Row Level Security
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "attachments_policy" ON attachments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create storage bucket (run in Supabase Dashboard > Storage > New Bucket)
-- Bucket name: attachments
-- Public: true (or configure as needed)

-- Note: You need to create the 'attachments' bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New Bucket"
-- 3. Name: attachments
-- 4. Toggle "Public" to ON
-- 5. Click "Create Bucket"
