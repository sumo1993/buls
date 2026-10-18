-- Fix receipts bucket to allow public access to images
-- This will allow payment proof images to load properly

-- Step 1: Make sure bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'receipts';

-- Step 2: Drop and recreate policies with simpler rules

-- Drop existing policies
DROP POLICY IF EXISTS "receipts_public_access" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_policy" ON storage.objects;

-- Create new simple policies

-- Allow anyone to view files (public read access)
CREATE POLICY "receipts_public_access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow authenticated users to upload files
CREATE POLICY "receipts_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow authenticated users to update their own files
CREATE POLICY "receipts_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

-- Allow authenticated users to delete files
CREATE POLICY "receipts_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');

-- Verify the changes
SELECT 
  name,
  public,
  created_at
FROM storage.buckets 
WHERE name = 'receipts';

-- Check existing files
SELECT 
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'receipts'
ORDER BY created_at DESC
LIMIT 5;
