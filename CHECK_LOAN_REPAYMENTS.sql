-- Check if loan repayments exist with payment proofs for the specific loan

SELECT 
  lr.id,
  lr.loan_id,
  lr.amount,
  lr.payment_method,
  lr.payment_type,
  CASE 
    WHEN lr.payment_proof_url IS NULL THEN 'NO PROOF'
    WHEN LENGTH(lr.payment_proof_url) > 100 THEN 'HAS PROOF (base64: ' || LENGTH(lr.payment_proof_url) || ' chars)'
    ELSE 'HAS PROOF: ' || lr.payment_proof_url
  END as proof_status,
  lr.created_at,
  lr.verified_at,
  lr.status
FROM loan_repayments lr
WHERE lr.loan_id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'
ORDER BY lr.created_at DESC;

-- Also check the loan status
SELECT 
  id,
  amount,
  amount_paid,
  balance,
  status,
  repayment_status
FROM loans
WHERE id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec';
