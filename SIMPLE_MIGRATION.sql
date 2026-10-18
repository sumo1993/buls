-- =====================================================
-- SIMPLE STEP-BY-STEP MIGRATION
-- Run each section ONE AT A TIME in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- SECTION 1: Add secretary role (RUN THIS FIRST)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'secretary' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'secretary';
    END IF;
END
$$;

SELECT 'Section 1 Complete: Secretary role added' as status;

-- =====================================================
-- SECTION 2: Add collected status (RUN THIS SECOND)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'collected' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
    ) THEN
        ALTER TYPE payment_status ADD VALUE 'collected';
    END IF;
END
$$;

SELECT 'Section 2 Complete: Collected status added' as status;

-- =====================================================
-- SECTION 3: Add payment columns (RUN THIS THIRD)
-- =====================================================

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS collection_method TEXT,
ADD COLUMN IF NOT EXISTS collection_notes TEXT,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'student_upload';

SELECT 'Section 3 Complete: Payment columns added' as status;

-- =====================================================
-- SECTION 4: Create union_ranks table (RUN THIS FOURTH)
-- =====================================================

CREATE TABLE IF NOT EXISTS union_ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rank_name TEXT UNIQUE NOT NULL,
  rank_level INTEGER DEFAULT 0,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS union_rank_id UUID REFERENCES union_ranks(id);

INSERT INTO union_ranks (rank_name, rank_level, description) VALUES
  ('President', 100, 'Union President'),
  ('Vice President', 90, 'Union Vice President'),
  ('Treasurer', 80, 'Union Treasurer'),
  ('Finance Secretary', 70, 'Finance Secretary'),
  ('General Secretary', 70, 'General Secretary'),
  ('Secretary', 60, 'Secretary'),
  ('Member', 10, 'Regular Member')
ON CONFLICT (rank_name) DO NOTHING;

SELECT 'Section 4 Complete: Union ranks created' as status;
SELECT COUNT(*) as ranks_count FROM union_ranks;

-- =====================================================
-- SECTION 5: Create dues_structure table (RUN THIS FIFTH)
-- =====================================================

CREATE TABLE IF NOT EXISTS dues_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scholarship_type_text TEXT NOT NULL,
  is_executive BOOLEAN NOT NULL DEFAULT FALSE,
  monthly_amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scholarship_type_text, is_executive)
);

SELECT 'Section 5 Complete: Dues structure table created' as status;

-- Verify the table was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dues_structure';

-- =====================================================
-- SECTION 6: Insert dues matrix (RUN THIS SIXTH - ONLY AFTER SECTION 5)
-- =====================================================

INSERT INTO dues_structure (scholarship_type_text, is_executive, monthly_amount, description)
VALUES
  ('csc', TRUE, 25.00, 'CSC - Executive'),
  ('csc', FALSE, 15.00, 'CSC - Member'),
  ('government', TRUE, 30.00, 'Government - Executive'),
  ('government', FALSE, 20.00, 'Government - Member'),
  ('self_support', TRUE, 110.00, 'Self Support - Executive'),
  ('self_support', FALSE, 100.00, 'Self Support - Member'),
  ('partial', TRUE, 60.00, 'Partial - Executive'),
  ('partial', FALSE, 50.00, 'Partial - Member'),
  ('university', TRUE, 40.00, 'University - Executive'),
  ('university', FALSE, 30.00, 'University - Member'),
  ('other', TRUE, 100.00, 'Other - Executive'),
  ('other', FALSE, 100.00, 'Other - Member')
ON CONFLICT (scholarship_type_text, is_executive) DO NOTHING;

SELECT 'Section 6 Complete: Dues matrix inserted' as status;
SELECT COUNT(*) as dues_count FROM dues_structure;

-- =====================================================
-- SECTION 7: Create calculation functions (RUN THIS SEVENTH)
-- =====================================================

CREATE OR REPLACE FUNCTION is_executive_rank(p_rank_level INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_rank_level >= 60;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_monthly_due(p_user_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_scholarship_type TEXT;
  v_rank_level INTEGER;
  v_is_executive BOOLEAN;
  v_monthly_due DECIMAL(10, 2);
BEGIN
  SELECT 
    LOWER(COALESCE(mp.scholarship_type::TEXT, 'other')),
    COALESCE(ur.rank_level, 10)
  INTO v_scholarship_type, v_rank_level
  FROM users u
  LEFT JOIN members_profile mp ON mp.user_id = u.id
  LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
  WHERE u.id = p_user_id;
  
  v_is_executive := is_executive_rank(v_rank_level);
  
  SELECT monthly_amount INTO v_monthly_due
  FROM dues_structure
  WHERE scholarship_type_text = v_scholarship_type
    AND is_executive = v_is_executive
    AND is_active = TRUE
  LIMIT 1;
  
  IF v_monthly_due IS NULL THEN
    v_monthly_due := 100.00;
  END IF;
  
  RETURN v_monthly_due;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_due_info(p_user_id UUID)
RETURNS TABLE (
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

SELECT 'Section 7 Complete: Functions created' as status;

-- =====================================================
-- SECTION 8: Create financial reports table (RUN THIS EIGHTH)
-- =====================================================

CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL,
  report_period TEXT NOT NULL,
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_revenue DECIMAL(10, 2),
  total_payments INTEGER,
  total_loans_issued DECIMAL(10, 2),
  total_loans_repaid DECIMAL(10, 2),
  report_data JSONB,
  notes TEXT,
  submitted_to_body BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE
);

SELECT 'Section 8 Complete: Financial reports table created' as status;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

SELECT 'MIGRATION COMPLETE!' as final_status;

SELECT 'dues_structure' as table_name, COUNT(*)::TEXT as row_count FROM dues_structure
UNION ALL
SELECT 'union_ranks', COUNT(*)::TEXT FROM union_ranks
UNION ALL
SELECT 'financial_reports', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_reports') THEN 'EXISTS' ELSE 'MISSING' END;

-- =====================================================
-- DONE! ✅
-- =====================================================
