-- =====================================================
-- CREATE STORAGE BUCKET FOR FILES
-- =====================================================
-- This creates a storage bucket for pictures and videos
-- =====================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files
CREATE POLICY "Public Access Files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'files');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload Files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated Update Files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'files');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated Delete Files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'files');

-- =====================================================
-- STORAGE BUCKET CREATED
-- =====================================================
-- Bucket name: files
-- Public: Yes
-- Allowed operations: SELECT, INSERT, UPDATE, DELETE
-- =====================================================
