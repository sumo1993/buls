-- ==========================================
-- FIX STORAGE RLS POLICIES FOR RECEIPTS BUCKET
-- Error: "new row violates row-level security policy"
-- ==========================================

-- Step 1: Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "Allow authenticated receipt uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public receipt read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated receipt updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated receipt delete" ON storage.objects;

-- Step 2: Create the receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 
  'receipts', 
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];

-- Step 3: Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive policies for receipts bucket

-- Policy 1: Allow anyone (authenticated or anonymous) to upload to receipts
-- This is the most permissive approach - adjust based on your security needs
CREATE POLICY "receipts_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

-- Policy 2: Allow anyone to read from receipts bucket
CREATE POLICY "receipts_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Policy 3: Allow anyone to update files in receipts bucket
CREATE POLICY "receipts_update_policy"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');

-- Policy 4: Allow anyone to delete from receipts bucket
CREATE POLICY "receipts_delete_policy"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts');

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check if bucket exists and is public
SELECT 
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'receipts';

-- Check if RLS is enabled on storage.objects
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check all policies for receipts bucket
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%receipts%';

-- ==========================================
-- EXPECTED RESULTS
-- ==========================================

-- Bucket query should show:
-- id: receipts
-- name: receipts
-- public: true
-- file_size_limit: 5242880
-- allowed_mime_types: {image/jpeg, image/png, image/jpg, image/gif, image/webp}

-- RLS query should show:
-- tablename: objects
-- rowsecurity: true

-- Policies query should show 4 policies:
-- 1. receipts_insert_policy (INSERT)
-- 2. receipts_select_policy (SELECT)
-- 3. receipts_update_policy (UPDATE)
-- 4. receipts_delete_policy (DELETE)

-- ==========================================
-- ALTERNATIVE: MORE SECURE POLICIES
-- ==========================================

-- If you want ONLY authenticated users to upload, use these instead:
-- (Comment out the permissive policies above and uncomment these)

/*
-- Only authenticated users can upload
CREATE POLICY "receipts_auth_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Anyone can read (for treasurer verification)
CREATE POLICY "receipts_public_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Only authenticated users can update
CREATE POLICY "receipts_auth_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');

-- Only authenticated users can delete
CREATE POLICY "receipts_auth_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
*/

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================

-- If still having issues, check user authentication:
-- SELECT auth.uid(); -- Should return a user ID when logged in

-- Check if user has a valid JWT token:
-- SELECT auth.role(); -- Should return 'authenticated' when logged in

-- ==========================================
-- SUCCESS INDICATORS
-- ==========================================

-- After running this script:
-- ✅ Bucket exists and is public
-- ✅ RLS is enabled but policies allow operations
-- ✅ Members can upload payment proofs
-- ✅ No "violates row-level security policy" errors
-- ✅ Uploads succeed with "Payment proof uploaded successfully"

-- ==========================================
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ==========================================
