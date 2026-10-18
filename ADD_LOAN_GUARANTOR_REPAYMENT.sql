-- Add guarantor and repayment date fields to loans table

-- Add new columns
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS guarantor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guarantor_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS guarantor_relationship VARCHAR(100),
ADD COLUMN IF NOT EXISTS expected_repayment_date DATE,
ADD COLUMN IF NOT EXISTS actual_repayment_date DATE;

-- Add comments
COMMENT ON COLUMN loans.guarantor_name IS 'Full name of the person guaranteeing the loan';
COMMENT ON COLUMN loans.guarantor_phone IS 'Phone number of the guarantor';
COMMENT ON COLUMN loans.guarantor_relationship IS 'Relationship between member and guarantor';
COMMENT ON COLUMN loans.expected_repayment_date IS 'Date when member expects to repay the loan';
COMMENT ON COLUMN loans.actual_repayment_date IS 'Actual date when loan was fully repaid';

-- Create index for repayment tracking
CREATE INDEX IF NOT EXISTS idx_loans_expected_repayment ON loans(expected_repayment_date) WHERE status IN ('approved', 'disbursed');
CREATE INDEX IF NOT EXISTS idx_loans_guarantor ON loans(guarantor_name) WHERE guarantor_name IS NOT NULL;

-- View overdue loans (loans past expected repayment date)
CREATE OR REPLACE VIEW overdue_loans AS
SELECT 
    l.*,
    u.full_name as member_name,
    u.email as member_email,
    (CURRENT_DATE - l.expected_repayment_date) as days_overdue
FROM loans l
JOIN users u ON l.user_id = u.id
WHERE l.status IN ('approved', 'disbursed')
AND l.expected_repayment_date < CURRENT_DATE
ORDER BY l.expected_repayment_date ASC;

COMMENT ON VIEW overdue_loans IS 'Shows all loans that are past their expected repayment date';
