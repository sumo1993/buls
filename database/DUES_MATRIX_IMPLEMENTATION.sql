-- =====================================================
-- DUES MATRIX IMPLEMENTATION MIGRATION
-- =====================================================
-- This migration creates the dues calculation system
-- based on scholarship status and union rank
-- =====================================================

-- Create dues_structure table to store payment amounts
CREATE TABLE IF NOT EXISTS dues_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_type TEXT NOT NULL, -- 'scholarship' or 'rank'
  category_value TEXT NOT NULL, -- e.g., 'CSC', 'MOFCOM', 'President', etc.
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_type, category_value)
);

-- Insert default scholarship payment amounts
INSERT INTO dues_structure (category_type, category_value, amount) VALUES
  ('scholarship', 'CSC', 0),
  ('scholarship', 'MOFCOM', 0),
  ('scholarship', 'BILATERAL', 0),
  ('scholarship', 'SELF', 100),
  ('scholarship', 'PARTIAL', 50),
  ('scholarship', 'OTHER', 100)
ON CONFLICT (category_type, category_value) DO NOTHING;

-- Insert default rank payment amounts
INSERT INTO dues_structure (category_type, category_value, amount) VALUES
  ('rank', 'President', 0),
  ('rank', 'Vice President', 0),
  ('rank', 'General Secretary', 0),
  ('rank', 'Treasurer', 0),
  ('rank', 'Finance Secretary', 0),
  ('rank', 'Member', 100)
ON CONFLICT (category_type, category_value) DO NOTHING;

-- Create function to calculate monthly due based on scholarship and rank
CREATE OR REPLACE FUNCTION calculate_monthly_due(p_user_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_scholarship_amount DECIMAL(10, 2) DEFAULT 100;
  v_rank_amount DECIMAL(10, 2) DEFAULT 0;
  v_scholarship_type TEXT;
  v_rank_name TEXT;
BEGIN
  -- Get member's scholarship type
  SELECT scholarship_type INTO v_scholarship_type
  FROM members_profile
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Get member's rank name
  SELECT ur.rank_name INTO v_rank_name
  FROM users u
  LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
  WHERE u.id = p_user_id
  LIMIT 1;
  
  -- Get scholarship amount from dues_structure
  SELECT amount INTO v_scholarship_amount
  FROM dues_structure
  WHERE category_type = 'scholarship'
    AND UPPER(category_value) = UPPER(v_scholarship_type)
  LIMIT 1;
  
  -- Get rank amount from dues_structure
  SELECT amount INTO v_rank_amount
  FROM dues_structure
  WHERE category_type = 'rank'
    AND UPPER(category_value) = UPPER(v_rank_name)
  LIMIT 1;
  
  -- Return the higher of scholarship or rank amount
  RETURN COALESCE(GREATEST(v_scholarship_amount, v_rank_amount), 100);
END;
$$ LANGUAGE plpgsql;

-- Create function to update dues_structure amounts
CREATE OR REPLACE FUNCTION update_dues_amount(
  p_category_type TEXT,
  p_category_value TEXT,
  p_amount DECIMAL(10, 2)
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO dues_structure (category_type, category_value, amount)
  VALUES (p_category_type, p_category_value, p_amount)
  ON CONFLICT (category_type, category_value)
  DO UPDATE SET
    amount = p_amount,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dues_structure_updated_at
  BEFORE UPDATE ON dues_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- You can now use the calculate_monthly_due() function
-- to calculate dues for any member
-- =====================================================
