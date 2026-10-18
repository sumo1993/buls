-- =====================================================
-- Dues Calculation System for BULS Management
-- Based on Scholarship Type AND Union Rank
-- =====================================================

-- Step 1: Create dues_structure table
CREATE TABLE IF NOT EXISTS dues_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scholarship_type TEXT NOT NULL,
  rank_category TEXT NOT NULL CHECK (rank_category IN ('executive', 'member')),
  monthly_amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scholarship_type, rank_category)
);

CREATE INDEX IF NOT EXISTS idx_dues_structure_scholarship ON dues_structure(scholarship_type);
CREATE INDEX IF NOT EXISTS idx_dues_structure_active ON dues_structure(is_active);

-- Step 2: Insert default dues structure
-- Executive = Rank level 60+ (President, VP, Treasurer, Secretaries)
-- Member = Rank level below 60 (Regular members)

INSERT INTO dues_structure (scholarship_type, rank_category, monthly_amount, description) VALUES
  -- CSC Scholarship
  ('csc', 'executive', 25.00, 'CSC Scholarship - Executive Member'),
  ('csc', 'member', 15.00, 'CSC Scholarship - Regular Member'),
  
  -- Government Scholarship
  ('government', 'executive', 30.00, 'Government Scholarship - Executive Member'),
  ('government', 'member', 20.00, 'Government Scholarship - Regular Member'),
  
  -- Self-support (Zifei)
  ('self_support', 'executive', 110.00, 'Self-support - Executive Member'),
  ('self_support', 'member', 100.00, 'Self-support - Regular Member'),
  
  -- Partial Scholarship
  ('partial', 'executive', 60.00, 'Partial Scholarship - Executive Member'),
  ('partial', 'member', 50.00, 'Partial Scholarship - Regular Member'),
  
  -- University Scholarship
  ('university', 'executive', 35.00, 'University Scholarship - Executive Member'),
  ('university', 'member', 25.00, 'University Scholarship - Regular Member'),
  
  -- No Scholarship
  ('none', 'executive', 120.00, 'No Scholarship - Executive Member'),
  ('none', 'member', 100.00, 'No Scholarship - Regular Member')
ON CONFLICT (scholarship_type, rank_category) DO UPDATE SET
  monthly_amount = EXCLUDED.monthly_amount,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Step 3: Create function to calculate monthly due for a user
CREATE OR REPLACE FUNCTION calculate_monthly_due(p_user_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_scholarship_type TEXT;
  v_rank_level INTEGER;
  v_rank_category TEXT;
  v_monthly_due DECIMAL(10, 2);
BEGIN
  -- Get user's scholarship and rank level
  SELECT 
    LOWER(mp.scholarship_type),
    COALESCE(ur.rank_level, 10)
  INTO v_scholarship_type, v_rank_level
  FROM users u
  LEFT JOIN members_profile mp ON mp.user_id = u.id
  LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
  WHERE u.id = p_user_id;
  
  -- Default to 'none' if no scholarship type
  IF v_scholarship_type IS NULL THEN
    v_scholarship_type := 'none';
  END IF;
  
  -- Determine rank category (Executive = level 60+, Member = below 60)
  IF v_rank_level >= 60 THEN
    v_rank_category := 'executive';
  ELSE
    v_rank_category := 'member';
  END IF;
  
  -- Get the due amount from dues_structure
  SELECT monthly_amount
  INTO v_monthly_due
  FROM dues_structure
  WHERE scholarship_type = v_scholarship_type
    AND rank_category = v_rank_category
    AND is_active = TRUE
  LIMIT 1;
  
  -- Return the due amount (or default to 100 if not found)
  RETURN COALESCE(v_monthly_due, 100.00);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to get all scholarship types
CREATE OR REPLACE FUNCTION get_scholarship_types()
RETURNS TABLE(scholarship_type TEXT, display_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    scholarship_type,
    CASE scholarship_type
      WHEN 'csc' THEN 'CSC Scholarship'
      WHEN 'government' THEN 'Government Scholarship'
      WHEN 'self_support' THEN 'Self-support (Zifei)'
      WHEN 'partial' THEN 'Partial Scholarship'
      WHEN 'university' THEN 'University Scholarship'
      ELSE 'No Scholarship'
    END as display_name
  FROM dues_structure
  WHERE is_active = TRUE
  ORDER BY scholarship_type;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-calculate due when payment is created
CREATE OR REPLACE FUNCTION auto_calculate_payment_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-calculate if amount is not provided or is zero
  IF NEW.amount IS NULL OR NEW.amount = 0 THEN
    NEW.amount := calculate_monthly_due(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to payments table (drop if exists first)
DROP TRIGGER IF EXISTS auto_calculate_payment_due ON payments;
CREATE TRIGGER auto_calculate_payment_due
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_payment_amount();

-- Step 6: Create view for easy dues lookup
CREATE OR REPLACE VIEW v_dues_lookup AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(mp.full_name, u.email) as member_name,
  mp.scholarship_type,
  ur.rank_name as union_rank,
  ur.rank_level,
  CASE 
    WHEN ur.rank_level >= 60 THEN 'executive'
    ELSE 'member'
  END as rank_category,
  calculate_monthly_due(u.id) as monthly_due
FROM users u
LEFT JOIN members_profile mp ON mp.user_id = u.id
LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
WHERE u.role = 'student';

-- Step 7: Update timestamp trigger for dues_structure
CREATE OR REPLACE FUNCTION update_dues_structure_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dues_structure_timestamp ON dues_structure;
CREATE TRIGGER update_dues_structure_timestamp
  BEFORE UPDATE ON dues_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_dues_structure_timestamp();

-- Step 8: Comments for documentation
COMMENT ON TABLE dues_structure IS 'Monthly dues based on scholarship type and union rank';
COMMENT ON COLUMN dues_structure.rank_category IS 'executive (rank level 60+) or member (below 60)';
COMMENT ON FUNCTION calculate_monthly_due IS 'Calculate monthly due amount for a user based on their scholarship and rank';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- The system now:
-- 1. Stores dues by scholarship × rank category
-- 2. Auto-calculates dues when payments are created
-- 3. Provides v_dues_lookup view for easy querying
-- 4. Defaults to Member rank (level 10) for new users
-- =====================================================

-- Test the calculation:
-- SELECT calculate_monthly_due('user-uuid-here');
-- SELECT * FROM v_dues_lookup LIMIT 10;
