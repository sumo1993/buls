-- =====================================================
-- CREATE STORAGE BUCKET FOR MEMBER PHOTOS
-- =====================================================
-- This creates a storage bucket for member profile photos
-- =====================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access Member Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Member Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Member Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Member Photos" ON storage.objects;

-- Allow public access to read files
CREATE POLICY "Public Access Member Photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'member-photos');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload Member Photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'member-photos');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated Update Member Photos"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'member-photos')
WITH CHECK (bucket_id = 'member-photos');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated Delete Member Photos"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'member-photos');

-- =====================================================
-- STORAGE BUCKET CREATED
-- =====================================================
-- Bucket name: member-photos
-- Public: Yes
-- Allowed operations: SELECT, INSERT, UPDATE, DELETE
-- =====================================================
