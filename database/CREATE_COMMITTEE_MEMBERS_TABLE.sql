-- =====================================================
-- CREATE COMMITTEE MEMBERS TABLE
-- =====================================================
-- This creates a table to manage committee memberships
-- =====================================================

-- Create committee_members table
CREATE TABLE IF NOT EXISTS committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(committee_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_committee_members_committee_id ON committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_user_id ON committee_members(user_id);

-- Enable RLS
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read committee members
CREATE POLICY "Authenticated Read Committee Members"
ON committee_members FOR SELECT
TO authenticated
USING (true);

-- Allow admins and secretaries to insert committee members
CREATE POLICY "Admin Insert Committee Members"
ON committee_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'secretary')
  )
);

-- Allow admins and secretaries to update committee members
CREATE POLICY "Admin Update Committee Members"
ON committee_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'secretary')
  )
);

-- Allow admins and secretaries to delete committee members
CREATE POLICY "Admin Delete Committee Members"
ON committee_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'secretary')
  )
);

-- =====================================================
-- COMMITTEE MEMBERS TABLE CREATED
-- =====================================================
