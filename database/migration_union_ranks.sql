-- =====================================================
-- Union Ranks System for BULS Management
-- =====================================================

-- Step 1: Create union_ranks table
CREATE TABLE IF NOT EXISTS union_ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rank_name TEXT UNIQUE NOT NULL,
  rank_level INTEGER DEFAULT 0, -- Higher number = higher rank
  description TEXT,
  permissions JSONB DEFAULT '{}', -- Flexible permissions storage
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_union_ranks_name ON union_ranks(rank_name);
CREATE INDEX IF NOT EXISTS idx_union_ranks_level ON union_ranks(rank_level);

-- Step 2: Add union_rank_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS union_rank_id UUID REFERENCES union_ranks(id);

CREATE INDEX IF NOT EXISTS idx_users_union_rank ON users(union_rank_id);

-- Step 3: Insert default union ranks
INSERT INTO union_ranks (rank_name, rank_level, description) VALUES
  ('President', 100, 'Union President - Highest authority'),
  ('Vice President', 90, 'Union Vice President - Second in command'),
  ('Treasurer', 80, 'Union Treasurer - Financial officer'),
  ('Finance Secretary', 70, 'Finance Secretary - Financial records'),
  ('General Secretary', 70, 'General Secretary - Administrative head'),
  ('Secretary', 60, 'Secretary - Administrative support'),
  ('Member', 10, 'Regular Union Member')
ON CONFLICT (rank_name) DO NOTHING;

-- Step 4: Create audit log for rank changes
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'rank_created';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'rank_updated';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'rank_deleted';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'member_rank_changed';

-- Step 5: Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_union_ranks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_union_ranks_timestamp 
BEFORE UPDATE ON union_ranks
FOR EACH ROW EXECUTE FUNCTION update_union_ranks_updated_at();

-- Step 6: Comments for documentation
COMMENT ON TABLE union_ranks IS 'Union positions/ranks that can be assigned to members';
COMMENT ON COLUMN union_ranks.rank_level IS 'Higher number = higher authority level';
COMMENT ON COLUMN union_ranks.permissions IS 'JSON object storing specific permissions for this rank';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Now you can:
-- 1. Create new ranks (Admin/Secretary only)
-- 2. Assign ranks to members
-- 3. Track rank hierarchy with rank_level
-- 4. Store custom permissions per rank
-- =====================================================
