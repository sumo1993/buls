-- Fix payment_type for existing loan repayments
-- Change 'member_payment' to 'member' to match treasurer filter

UPDATE loan_repayments
SET payment_type = 'member'
WHERE payment_type = 'member_payment';

-- Verify the update
SELECT 
  id,
  loan_id,
  amount,
  payment_type,
  verification_status,
  payment_date,
  CASE 
    WHEN payment_proof_url IS NOT NULL THEN 'Has proof (length: ' || LENGTH(payment_proof_url) || ')'
    ELSE 'No proof'
  END as proof_status
FROM loan_repayments
WHERE loan_id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'
ORDER BY payment_date DESC;
