-- Fix Payment #1 - Set member-submitted payment back to pending
-- This payment was submitted by the member themselves and needs treasurer approval

-- First, check the current status of loan repayments for loan: 2ea425ee-f40a-4a4e-a3dd-732183dff4ec
SELECT 
  id,
  loan_id,
  amount,
  payment_type,
  verification_status,
  verified_by,
  verified_at,
  recorded_by,
  payment_date,
  created_at
FROM loan_repayments
WHERE loan_id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'
ORDER BY payment_date DESC;

-- Update the first payment (member-submitted) to pending status
-- The member-submitted payment should be pending until treasurer verifies it
UPDATE loan_repayments
SET 
  verification_status = 'pending',
  verified_by = NULL,
  verified_at = NULL
WHERE 
  loan_id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'
  AND payment_type = 'member'  -- Only member payments need verification
  AND verification_status = 'verified';  -- Only update if currently verified

-- Verify the changes
SELECT 
  id,
  amount,
  payment_type,
  verification_status,
  verified_by,
  verified_at,
  payment_date
FROM loan_repayments
WHERE loan_id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'
ORDER BY payment_date DESC;
