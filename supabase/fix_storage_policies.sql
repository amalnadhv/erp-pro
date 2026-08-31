-- FIX: Ensure cheques bucket exists and anon can upload
-- Run this in Supabase SQL Editor

-- 1. Make sure bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cheques', 'cheques', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 10485760;

-- 2. Drop ALL existing policies on storage.objects to start clean
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON storage.objects';
  END LOOP;
END $$;

-- 3. Create permissive policies for ALL roles (anon + authenticated)
-- INSERT: allow upload to cheques bucket
CREATE POLICY "allow_upload_cheques"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'cheques');

-- SELECT: allow read from cheques bucket  
CREATE POLICY "allow_read_cheques"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'cheques');

-- DELETE: allow delete from cheques bucket
CREATE POLICY "allow_delete_cheques"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'cheques');

-- 4. Also re-create policies for the attachments bucket
CREATE POLICY "allow_upload_attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "allow_read_attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'attachments');

CREATE POLICY "allow_delete_attachments"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'attachments');
