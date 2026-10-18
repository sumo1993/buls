-- Enable RLS on loan_repayments table if not already enabled
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Members can view own loan repayments" ON loan_repayments;
DROP POLICY IF EXISTS "Treasurer can view all loan repayments" ON loan_repayments;
DROP POLICY IF EXISTS "Members can create loan repayments" ON loan_repayments;
DROP POLICY IF EXISTS "Treasurer can update loan repayments" ON loan_repayments;

-- Policy 1: Members can view their own loan repayments
CREATE POLICY "Members can view own loan repayments"
ON loan_repayments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = loan_repayments.loan_id
    AND loans.user_id = auth.uid()
  )
);

-- Policy 2: Treasurer, Finance, and Admin can view all loan repayments
CREATE POLICY "Treasurer can view all loan repayments"
ON loan_repayments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.uid()
    AND users.role IN ('admin', 'treasurer', 'finance')
  )
);

-- Policy 3: Members can create repayments for their own loans
CREATE POLICY "Members can create loan repayments"
ON loan_repayments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = loan_repayments.loan_id
    AND loans.user_id = auth.uid()
  )
);

-- Policy 4: Treasurer can update loan repayments (for verification)
CREATE POLICY "Treasurer can update loan repayments"
ON loan_repayments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.uid()
    AND users.role IN ('admin', 'treasurer', 'finance')
  )
);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'loan_repayments'
ORDER BY policyname;
