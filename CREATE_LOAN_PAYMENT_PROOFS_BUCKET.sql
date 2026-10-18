-- =====================================================
-- CREATE STORAGE BUCKET FOR LOAN PAYMENT PROOFS
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-payment-proofs', 'loan-payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create permissive RLS policies for the bucket
-- Allow everyone to view payment proofs
CREATE POLICY IF NOT EXISTS "Allow all to view loan-payment-proofs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'loan-payment-proofs');

-- Allow authenticated users to upload payment proofs
CREATE POLICY IF NOT EXISTS "Allow authenticated to upload loan-payment-proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loan-payment-proofs');

-- Allow authenticated users to update payment proofs
CREATE POLICY IF NOT EXISTS "Allow authenticated to update loan-payment-proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'loan-payment-proofs');

-- Allow authenticated users to delete payment proofs
CREATE POLICY IF NOT EXISTS "Allow authenticated to delete loan-payment-proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'loan-payment-proofs');

-- =====================================================
-- DONE! Bucket created with public access
-- =====================================================
