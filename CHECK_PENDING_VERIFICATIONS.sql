-- Check what pending verifications exist
SELECT 
  id as repayment_id,
  loan_id,
  amount,
  payment_method,
  payment_type,
  verification_status,
  payment_date,
  created_at
FROM loan_repayments
WHERE verification_status = 'pending'
  AND payment_type = 'member'
ORDER BY created_at DESC;

-- Check all repayments for the specific loan
SELECT 
  id as repayment_id,
  loan_id,
  amount,
  payment_method,
  payment_type,
  verification_status,
  payment_date,
  created_at
FROM loan_repayments
WHERE loan_id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'
ORDER BY created_at DESC;
