DROP POLICY IF EXISTS "Allow authenticated receipt uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public receipt read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated receipt updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated receipt delete" ON storage.objects;

CREATE POLICY "receipts_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "receipts_update_policy"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_delete_policy"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts');
