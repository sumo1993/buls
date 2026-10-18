-- =====================================================
-- DUES CALCULATION SYSTEM - MATRIX-BASED APPROACH
-- =====================================================
-- This system calculates dues based on BOTH scholarship type AND union rank
-- 
-- EXAMPLES from user:
-- - President with CSC scholarship = ¥15/month (BUT also executive = ¥25/month)
-- - Executives pay ¥25/month
-- - The MATRIX approach allows us to handle all combinations
-- =====================================================

-- =====================================================
-- PART 1: CREATE DUES STRUCTURE TABLE
-- =====================================================

-- Create dues_structure table if not exists
CREATE TABLE IF NOT EXISTS dues_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scholarship_type TEXT NOT NULL,  -- 'csc', 'government', 'self_support', etc.
  is_executive BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE if rank is executive level
  monthly_amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scholarship_type, is_executive)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_dues_structure_lookup ON dues_structure(scholarship_type, is_executive, is_active);

-- =====================================================
-- PART 2: DEFINE EXECUTIVE RANKS
-- =====================================================

-- Executive ranks are: President (100), Vice President (90), Treasurer (80), 
-- Finance Secretary (70), General Secretary (70), Secretary (60)
-- Regular members: Member (10)

-- Create a function to check if a rank is executive
CREATE OR REPLACE FUNCTION is_executive_rank(p_rank_level INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Rank level 60 or above is considered executive
  RETURN p_rank_level >= 60;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- PART 3: INSERT DEFAULT DUES MATRIX
-- =====================================================

-- Clear existing data (optional - comment out if you want to keep)
-- TRUNCATE TABLE dues_structure;

-- Insert the dues matrix based on user's example
-- CSC Scholarship + Executive = ¥25 (executive due takes precedence)
-- CSC Scholarship + Regular Member = ¥15
-- Government Scholarship + Executive = ¥30
-- Government Scholarship + Regular Member = ¥20
-- Self-support + Executive = ¥110
-- Self-support + Regular Member = ¥100

INSERT INTO dues_structure (scholarship_type, is_executive, monthly_amount, description)
VALUES
  -- CSC Scholarship
  ('csc', TRUE, 25.00, 'CSC Scholarship - Executive (President, VP, Treasurer, Secretaries)'),
  ('csc', FALSE, 15.00, 'CSC Scholarship - Regular Member'),
  
  -- Government Scholarship
  ('government', TRUE, 30.00, 'Government Scholarship - Executive'),
  ('government', FALSE, 20.00, 'Government Scholarship - Regular Member'),
  
  -- Self-support
  ('self_support', TRUE, 110.00, 'Self-support - Executive'),
  ('self_support', FALSE, 100.00, 'Self-support - Regular Member'),
  
  -- Partial Scholarship (if exists)
  ('partial', TRUE, 60.00, 'Partial Scholarship - Executive'),
  ('partial', FALSE, 50.00, 'Partial Scholarship - Regular Member'),
  
  -- University Scholarship (if exists)
  ('university', TRUE, 40.00, 'University Scholarship - Executive'),
  ('university', FALSE, 30.00, 'University Scholarship - Regular Member'),
  
  -- Other/Unknown (fallback)
  ('other', TRUE, 100.00, 'Other - Executive'),
  ('other', FALSE, 100.00, 'Other - Regular Member')
ON CONFLICT (scholarship_type, is_executive) 
DO UPDATE SET 
  monthly_amount = EXCLUDED.monthly_amount,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- PART 4: CREATE AUTOMATIC CALCULATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_monthly_due(
  p_user_id UUID
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_scholarship_type TEXT;
  v_rank_level INTEGER;
  v_is_executive BOOLEAN;
  v_monthly_due DECIMAL(10, 2);
BEGIN
  -- Get user's scholarship type and rank level
  SELECT 
    LOWER(COALESCE(mp.scholarship_type::TEXT, 'other')),
    COALESCE(ur.rank_level, 10)
  INTO v_scholarship_type, v_rank_level
  FROM users u
  LEFT JOIN members_profile mp ON mp.user_id = u.id
  LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
  WHERE u.id = p_user_id;
  
  -- Determine if executive
  v_is_executive := is_executive_rank(v_rank_level);
  
  -- Get applicable due amount
  SELECT monthly_amount
  INTO v_monthly_due
  FROM dues_structure
  WHERE scholarship_type = v_scholarship_type
    AND is_executive = v_is_executive
    AND is_active = TRUE
  LIMIT 1;
  
  -- Fallback to default if not found
  IF v_monthly_due IS NULL THEN
    v_monthly_due := 100.00; -- Default amount
  END IF;
  
  RETURN v_monthly_due;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 5: UPDATE PAYMENT FORM AUTO-CALCULATION
-- =====================================================

-- Create a function that returns due info for a user
CREATE OR REPLACE FUNCTION get_user_due_info(
  p_user_id UUID
) RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  scholarship_type TEXT,
  rank_name TEXT,
  rank_level INTEGER,
  is_executive BOOLEAN,
  monthly_due DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    LOWER(COALESCE(mp.scholarship_type::TEXT, 'other')) as scholarship_type,
    COALESCE(ur.rank_name, 'Member') as rank_name,
    COALESCE(ur.rank_level, 10) as rank_level,
    is_executive_rank(COALESCE(ur.rank_level, 10)) as is_executive,
    calculate_monthly_due(u.id) as monthly_due
  FROM users u
  LEFT JOIN members_profile mp ON mp.user_id = u.id
  LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: UPDATE MEMBERS_PROFILE WITH CALCULATED DUE
-- =====================================================

-- Add trigger to auto-update monthly_due_amount when profile or rank changes
CREATE OR REPLACE FUNCTION update_member_due_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the monthly_due_amount based on current scholarship and rank
  UPDATE members_profile
  SET monthly_due_amount = calculate_monthly_due(NEW.id),
      updated_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_user_due_amount ON users;

-- Create trigger for users table (when rank changes)
CREATE TRIGGER update_user_due_amount
AFTER UPDATE OF union_rank_id ON users
FOR EACH ROW
EXECUTE FUNCTION update_member_due_amount();

-- =====================================================
-- PART 7: UPDATE EXISTING MEMBERS' DUE AMOUNTS
-- =====================================================

-- Update all existing members' monthly_due_amount based on current scholarship and rank
UPDATE members_profile mp
SET monthly_due_amount = calculate_monthly_due(mp.user_id),
    updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = mp.user_id);

-- =====================================================
-- PART 8: ADD DUES STRUCTURE MANAGEMENT API
-- =====================================================

-- Function to get all dues structures
CREATE OR REPLACE FUNCTION get_all_dues_structures()
RETURNS TABLE (
  id UUID,
  scholarship_type TEXT,
  is_executive BOOLEAN,
  monthly_amount DECIMAL(10, 2),
  description TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.scholarship_type,
    ds.is_executive,
    ds.monthly_amount,
    ds.description,
    ds.is_active
  FROM dues_structure ds
  ORDER BY ds.scholarship_type, ds.is_executive DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update dues structure
CREATE OR REPLACE FUNCTION update_dues_structure(
  p_id UUID,
  p_monthly_amount DECIMAL(10, 2),
  p_description TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dues_structure
  SET 
    monthly_amount = p_monthly_amount,
    description = COALESCE(p_description, description),
    is_active = p_is_active,
    updated_at = NOW()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 9: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE dues_structure IS 'Matrix-based dues structure: Scholarship Type × Executive Status';
COMMENT ON COLUMN dues_structure.is_executive IS 'TRUE for executive ranks (level >= 60), FALSE for regular members';
COMMENT ON FUNCTION calculate_monthly_due IS 'Calculates monthly due based on scholarship type and union rank';
COMMENT ON FUNCTION is_executive_rank IS 'Returns TRUE if rank level is 60 or above (executive positions)';

-- =====================================================
-- PART 10: SAMPLE QUERIES FOR TESTING
-- =====================================================

-- Test: Get due for a specific user
-- SELECT calculate_monthly_due('user-uuid-here');

-- Test: Get full due info for a user
-- SELECT * FROM get_user_due_info('user-uuid-here');

-- Test: Get all dues structures
-- SELECT * FROM get_all_dues_structures();

-- Test: Check if a rank is executive
-- SELECT is_executive_rank(100); -- TRUE (President)
-- SELECT is_executive_rank(10);  -- FALSE (Member)

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- 
-- EXAMPLES:
-- 
-- 1. President with CSC Scholarship:
--    - Rank: President (level 100) → is_executive = TRUE
--    - Scholarship: CSC
--    - Result: ¥25/month (from dues_structure: csc + executive)
-- 
-- 2. Regular Member with CSC:
--    - Rank: Member (level 10) → is_executive = FALSE
--    - Scholarship: CSC
--    - Result: ¥15/month (from dues_structure: csc + non-executive)
-- 
-- 3. Treasurer with Self-support:
--    - Rank: Treasurer (level 80) → is_executive = TRUE
--    - Scholarship: self_support
--    - Result: ¥110/month (from dues_structure: self_support + executive)
-- 
-- =====================================================
