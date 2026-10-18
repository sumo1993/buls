-- Add multi-stage approval workflow to loans table
-- Workflow: Member → Secretary → Finance → Treasurer → Member

-- Add new columns for tracking the approval workflow
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS secretary_approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS secretary_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finance_approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS treasurer_disbursed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS treasurer_disbursed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finance_notes TEXT,
ADD COLUMN IF NOT EXISTS treasurer_notes TEXT;

-- Update the status enum to include new workflow stages
-- Note: In PostgreSQL, we can't directly modify enums, so we'll use a type cast approach
-- First, check current status values
DO $$
BEGIN
    -- Add new status values if they don't exist
    BEGIN
        ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'secretary_approved';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
    
    BEGIN
        ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'finance_approved';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
    
    BEGIN
        ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'disbursed';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END$$;

-- If the enum doesn't exist, create the column with new statuses
-- (This is for new installations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
        CREATE TYPE loan_status AS ENUM (
            'pending',
            'secretary_approved',
            'finance_approved',
            'disbursed',
            'approved',
            'rejected',
            'repaid'
        );
        
        -- If status column doesn't have the enum type, alter it
        ALTER TABLE loans 
        ALTER COLUMN status TYPE loan_status 
        USING status::loan_status;
    END IF;
END$$;

-- Create an index for faster queries on approval stages
CREATE INDEX IF NOT EXISTS idx_loans_secretary_approved ON loans(secretary_approved_by, secretary_approved_at);
CREATE INDEX IF NOT EXISTS idx_loans_finance_approved ON loans(finance_approved_by, finance_approved_at);
CREATE INDEX IF NOT EXISTS idx_loans_treasurer_disbursed ON loans(treasurer_disbursed_by, treasurer_disbursed_at);

-- Add comments for documentation
COMMENT ON COLUMN loans.secretary_approved_by IS 'Secretary who approved the loan application';
COMMENT ON COLUMN loans.secretary_approved_at IS 'Timestamp when secretary approved';
COMMENT ON COLUMN loans.finance_approved_by IS 'Finance officer who verified financial records';
COMMENT ON COLUMN loans.finance_approved_at IS 'Timestamp when finance approved';
COMMENT ON COLUMN loans.treasurer_disbursed_by IS 'Treasurer who disbursed the payment';
COMMENT ON COLUMN loans.treasurer_disbursed_at IS 'Timestamp when loan was disbursed';
COMMENT ON COLUMN loans.finance_notes IS 'Financial review notes and audit trail';
COMMENT ON COLUMN loans.treasurer_notes IS 'Payment processing notes';

-- Workflow Summary:
-- 1. Member creates loan (status: 'pending')
-- 2. Secretary reviews and approves (status: 'secretary_approved')
-- 3. Finance verifies financial records (status: 'finance_approved')
-- 4. Treasurer processes payment (status: 'disbursed' or 'approved')
-- 5. Member receives loan
-- 
-- At any stage, the application can be rejected (status: 'rejected')
-- When fully repaid, status becomes 'repaid'
