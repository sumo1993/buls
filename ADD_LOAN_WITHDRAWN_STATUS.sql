-- Add withdrawn status to loans

-- Add withdrawn status to the enum
DO $$
BEGIN
    BEGIN
        ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'withdrawn';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END$$;

-- Add withdrawal tracking columns
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT;

-- Add comments
COMMENT ON COLUMN loans.withdrawn_at IS 'Timestamp when member withdrew the loan application';
COMMENT ON COLUMN loans.withdrawn_reason IS 'Reason provided by member for withdrawing the loan';

-- Create index for withdrawn loans
CREATE INDEX IF NOT EXISTS idx_loans_withdrawn ON loans(withdrawn_at) WHERE status = 'withdrawn';

-- View for withdrawn loans (audit trail)
CREATE OR REPLACE VIEW withdrawn_loans_audit AS
SELECT 
    l.id,
    l.user_id,
    u.full_name as member_name,
    u.email as member_email,
    l.amount,
    l.reason as original_reason,
    l.withdrawn_reason,
    l.created_at as applied_at,
    l.withdrawn_at,
    EXTRACT(DAY FROM (l.withdrawn_at - l.created_at)) as days_before_withdrawal
FROM loans l
JOIN users u ON l.user_id = u.id
WHERE l.status = 'withdrawn'
ORDER BY l.withdrawn_at DESC;

COMMENT ON VIEW withdrawn_loans_audit IS 'Audit trail of all withdrawn loan applications';
