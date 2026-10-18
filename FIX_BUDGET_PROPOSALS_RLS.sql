-- Fix Budget Proposals RLS Policies
-- This ensures secretary can read, create, and update all budget proposals

-- First, let's see what policies exist (for debugging)
-- SELECT * FROM pg_policies WHERE tablename = 'budget_proposals';

-- Drop ALL existing budget_proposals policies
DROP POLICY IF EXISTS "Committee members can read their own proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Secretary can read all proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Treasurer can read all proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Finance can read all proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Budget head can read their assigned proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Committee members can create proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Committee members can update their own draft proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Budget head can update their assigned draft proposals" ON budget_proposals;
DROP POLICY IF EXISTS "Secretary can update proposal status" ON budget_proposals;
DROP POLICY IF EXISTS "Treasurer can update proposal status" ON budget_proposals;
DROP POLICY IF EXISTS "Secretary can create budget proposal assignments" ON budget_proposals;

-- Create comprehensive READ policies
CREATE POLICY "Secretary can read all proposals"
  ON budget_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'secretary'
    )
  );

CREATE POLICY "Treasurer can read all proposals"
  ON budget_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'treasurer'
    )
  );

CREATE POLICY "Finance can read all proposals"
  ON budget_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'finance'
    )
  );

CREATE POLICY "Budget head can read their assigned proposals"
  ON budget_proposals FOR SELECT
  USING (
    budget_head_id IN (
      SELECT u.id FROM users u
      WHERE u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Committee members can read their committee proposals"
  ON budget_proposals FOR SELECT
  USING (
    committee_id IN (
      SELECT cm.committee_id FROM committee_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Create INSERT policies
CREATE POLICY "Secretary can create budget proposal assignments"
  ON budget_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'secretary'
    )
  );

CREATE POLICY "Budget head can create proposals for their committees"
  ON budget_proposals FOR INSERT
  WITH CHECK (
    committee_id IN (
      SELECT cm.committee_id FROM committee_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Create UPDATE policies
CREATE POLICY "Secretary can update all proposals"
  ON budget_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'secretary'
    )
  );

CREATE POLICY "Treasurer can update all proposals"
  ON budget_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'treasurer'
    )
  );

CREATE POLICY "Budget head can update their assigned draft proposals"
  ON budget_proposals FOR UPDATE
  USING (
    budget_head_id IN (
      SELECT u.id FROM users u
      WHERE u.clerk_id = auth.uid()::text
    )
    AND status = 'draft'
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'budget_proposals'
ORDER BY cmd, policyname;
