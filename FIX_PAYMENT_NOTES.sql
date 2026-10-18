-- Check existing payment notes that say "Unknown User"
SELECT 
  id,
  loan_id,
  amount,
  payment_date,
  notes,
  recorded_by,
  payment_type
FROM loan_repayments
WHERE notes LIKE '%Unknown User%'
ORDER BY payment_date DESC;

-- After updating the treasurer's name in the users table,
-- you can optionally update the existing payment notes:

-- Replace 'Treasurer Name' with the actual treasurer's name
UPDATE loan_repayments
SET notes = REPLACE(notes, 'Unknown User', 'Treasurer Name')  -- ← CHANGE THIS
WHERE notes LIKE '%Unknown User%'
  AND payment_type IN ('treasurer', 'treasurer_recorded');

-- Verify the update
SELECT 
  id,
  loan_id,
  amount,
  payment_date,
  notes,
  payment_type
FROM loan_repayments
WHERE notes LIKE '%Treasurer Name%'  -- ← CHANGE THIS TO MATCH
ORDER BY payment_date DESC;
