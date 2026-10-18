-- =====================================================
-- CREATE STORAGE BUCKET FOR BIRTHDAY PHOTOS
-- =====================================================
-- This creates a storage bucket for birthday photos
-- =====================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('birthday-photos', 'birthday-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access Birthday Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Birthday Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Birthday Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Birthday Photos" ON storage.objects;

-- Allow public access to read files
CREATE POLICY "Public Access Birthday Photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'birthday-photos');

-- Allow ANY user to upload (for Clerk auth - uses anon key)
CREATE POLICY "Public Upload Birthday Photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'birthday-photos');

-- Allow ANY user to update
CREATE POLICY "Public Update Birthday Photos"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'birthday-photos')
WITH CHECK (bucket_id = 'birthday-photos');

-- Allow ANY user to delete
CREATE POLICY "Public Delete Birthday Photos"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'birthday-photos');

-- =====================================================
-- STORAGE BUCKET CREATED
-- =====================================================
-- Bucket name: birthday-photos
-- Public: Yes
-- Allowed operations: SELECT, INSERT, UPDATE, DELETE
-- =====================================================
