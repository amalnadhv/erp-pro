-- Storage policies for cheque template images
-- The bucket is public (read), but we need INSERT/DELETE policies for anon role

-- Allow anon to upload cheque images
insert into storage.buckets (id, name, public) values ('cheques', 'cheques', true)
on conflict (id) do nothing;

-- Drop existing policies if any
DROP POLICY IF EXISTS "cheques_insert_anon" ON storage.objects;
DROP POLICY IF EXISTS "cheques_select_anon" ON storage.objects;
DROP POLICY IF EXISTS "cheques_delete_anon" ON storage.objects;
DROP POLICY IF EXISTS "cheques_insert_all" ON storage.objects;
DROP POLICY IF EXISTS "cheques_select_all" ON storage.objects;
DROP POLICY IF EXISTS "cheques_delete_all" ON storage.objects;

-- Allow anyone to upload to cheques bucket
CREATE POLICY "cheques_insert_anon"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'cheques');

-- Allow anyone to read from cheques bucket
CREATE POLICY "cheques_select_anon"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'cheques');

-- Allow anyone to delete from cheques bucket
CREATE POLICY "cheques_delete_anon"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'cheques');

-- Also allow authenticated role (in case user is logged in)
CREATE POLICY "cheques_insert_auth"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cheques');

CREATE POLICY "cheques_select_auth"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cheques');

CREATE POLICY "cheques_delete_auth"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cheques');
