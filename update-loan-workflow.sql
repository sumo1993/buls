-- Update loan workflow: Secretary → Finance → Treasurer → Disbursement

-- Step 1: Add new loan statuses to the enum
DO $$
BEGIN
    -- Check if statuses exist before adding
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'secretary_approved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loan_status')) THEN
        ALTER TYPE loan_status ADD VALUE 'secretary_approved' AFTER 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'secretary_rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loan_status')) THEN
        ALTER TYPE loan_status ADD VALUE 'secretary_rejected' AFTER 'secretary_approved';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'finance_approved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loan_status')) THEN
        ALTER TYPE loan_status ADD VALUE 'finance_approved' AFTER 'secretary_rejected';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'finance_rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loan_status')) THEN
        ALTER TYPE loan_status ADD VALUE 'finance_rejected' AFTER 'finance_approved';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'disbursed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loan_status')) THEN
        ALTER TYPE loan_status ADD VALUE 'disbursed' AFTER 'finance_rejected';
    END IF;
END
$$;

-- Step 2: Add approval tracking fields to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS secretary_approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS secretary_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS secretary_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS finance_approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finance_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS disbursed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disbursement_method TEXT,
ADD COLUMN IF NOT EXISTS disbursement_notes TEXT;

-- Step 3: Add indexes for approval queries
CREATE INDEX IF NOT EXISTS idx_loans_secretary_approved_by ON loans(secretary_approved_by);
CREATE INDEX IF NOT EXISTS idx_loans_finance_approved_by ON loans(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_loans_disbursed_by ON loans(disbursed_by);

-- Step 4: Update audit_logs to include loan workflow actions
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'loan_secretary_approved' AFTER 'loan_rejected';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'loan_secretary_rejected' AFTER 'loan_secretary_approved';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'loan_finance_approved' AFTER 'loan_secretary_rejected';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'loan_finance_rejected' AFTER 'loan_finance_approved';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'loan_disbursed' AFTER 'loan_finance_rejected';

-- Step 5: Add comments for documentation
COMMENT ON TABLE loans IS 'Loan workflow: pending → secretary_approved/rejected → finance_approved/rejected → disbursed → repaid';
COMMENT ON COLUMN loans.secretary_approved_by IS 'Secretary who approved the loan (checks payment history/eligibility)';
COMMENT ON COLUMN loans.finance_approved_by IS 'Finance officer who approved the loan (checks financial viability)';
COMMENT ON COLUMN loans.disbursed_by IS 'Treasurer who disbursed the funds';
