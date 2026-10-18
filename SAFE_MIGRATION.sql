-- =====================================================
-- LSUB Management System - SAFE MIGRATION (Handles existing data)
-- =====================================================

-- =====================================================
-- PART 1: PAYMENT WORKFLOW ENHANCEMENTS
-- =====================================================

-- Add 'collected' status to payment_status enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'collected' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
    ) THEN
        ALTER TYPE payment_status ADD VALUE 'collected' AFTER 'pending';
    END IF;
END
$$;

-- Add collection tracking fields to payments table (IF NOT EXISTS)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS collection_method TEXT,
ADD COLUMN IF NOT EXISTS collection_notes TEXT;

-- Add receipt and recording fields for Finance
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE;

-- Add payment_source field (IF NOT EXISTS)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'student_upload';

-- Add constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_payment_source' 
        AND conrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments 
        ADD CONSTRAINT check_payment_source 
        CHECK (payment_source IN ('student_upload', 'treasurer_upload', 'cash'));
    END IF;
END
$$;

-- Create indexes (safe, won't error if exists)
CREATE INDEX IF NOT EXISTS idx_payments_collected_by ON payments(collected_by);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_source ON payments(payment_source);

-- =====================================================
-- PART 2: FINANCIAL REPORTS
-- =====================================================

-- Create financial_reports table (IF NOT EXISTS)
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

CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_period ON financial_reports(report_period);

-- Create function to generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number(p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  sequence_num TEXT;
  new_receipt_number TEXT;
BEGIN
  SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0')
  INTO sequence_num
  FROM payments
  WHERE year = p_year AND status = 'approved';
  
  new_receipt_number := 'REC-' || p_year || '-' || sequence_num;
  RETURN new_receipt_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: UNION RANKS SYSTEM
-- =====================================================

-- Create union_ranks table (IF NOT EXISTS)
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

CREATE INDEX IF NOT EXISTS idx_union_ranks_name ON union_ranks(rank_name);
CREATE INDEX IF NOT EXISTS idx_union_ranks_level ON union_ranks(rank_level);

-- Add union_rank_id to users table (IF NOT EXISTS)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS union_rank_id UUID REFERENCES union_ranks(id);

CREATE INDEX IF NOT EXISTS idx_users_union_rank ON users(union_rank_id);

-- Insert default union ranks (ON CONFLICT DO NOTHING - safe!)
INSERT INTO union_ranks (rank_name, rank_level, description) VALUES
  ('President', 100, 'Union President - Highest authority'),
  ('Vice President', 90, 'Union Vice President - Second in command'),
  ('Treasurer', 80, 'Union Treasurer - Financial officer'),
  ('Finance Secretary', 70, 'Finance Secretary - Financial records'),
  ('General Secretary', 70, 'General Secretary - Administrative head'),
  ('Secretary', 60, 'Secretary - Administrative support'),
  ('Member', 10, 'Regular Union Member')
ON CONFLICT (rank_name) DO NOTHING;

-- =====================================================
-- PART 4: AUDIT LOG ENHANCEMENTS
-- =====================================================

-- Add new action types to audit_logs enum (safe)
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'payment_collected';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'payment_recorded';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'report_generated';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'rank_created';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'rank_updated';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'rank_deleted';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'member_rank_changed';

-- =====================================================
-- PART 5: TRIGGERS
-- =====================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION update_union_ranks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (safe)
DROP TRIGGER IF EXISTS update_union_ranks_timestamp ON union_ranks;
CREATE TRIGGER update_union_ranks_timestamp 
BEFORE UPDATE ON union_ranks
FOR EACH ROW EXECUTE FUNCTION update_union_ranks_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN payments.payment_source IS 'How payment was initiated: student_upload, cash';
COMMENT ON COLUMN payments.collected_by IS 'Treasurer who collected the payment';
COMMENT ON TABLE financial_reports IS 'Financial reports for submission to governing body';
COMMENT ON TABLE union_ranks IS 'Union positions/ranks for members';
COMMENT ON COLUMN union_ranks.rank_level IS 'Higher = more authority (President=100, Member=10)';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
