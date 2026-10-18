-- Check if receipts bucket exists
SELECT 
    id, 
    name, 
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'receipts';

-- Check all policies for receipts bucket
SELECT 
    policyname,
    cmd as operation,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (policyname LIKE '%receipts%' OR policyname LIKE '%receipt%');
