-- Add budget_head_id column to budget_proposals table
-- The budget head is the member assigned by secretary to create the proposal

ALTER TABLE budget_proposals 
ADD COLUMN IF NOT EXISTS budget_head_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN budget_proposals.budget_head_id IS 'The member assigned by secretary to create and manage this budget proposal';

-- Update RLS policy to allow budget head to read their assigned proposals
CREATE POLICY "Budget head can read their assigned proposals"
  ON budget_proposals FOR SELECT
  USING (
    budget_head_id IN (
      SELECT u.id FROM users u
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Update RLS policy to allow budget head to update their assigned draft proposals
CREATE POLICY "Budget head can update their assigned draft proposals"
  ON budget_proposals FOR UPDATE
  USING (
    budget_head_id IN (
      SELECT u.id FROM users u
      WHERE u.clerk_id = auth.uid()::text
    )
    AND status = 'draft'
  );

-- Secretary can create budget proposal assignments (without title/description initially)
CREATE POLICY "Secretary can create budget proposal assignments"
  ON budget_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'secretary'
    )
  );
