-- ============================================
-- COMPLETE LOAN SYSTEM UPGRADE
-- Adds: Repayment tracking, Interest, Terms, Limits, Guarantors
-- ============================================

-- 1. CREATE LOAN REPAYMENTS TABLE
CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL, -- bank_transfer, cash, wechat, alipay
  payment_proof_url TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id), -- Who recorded this payment (treasurer or system)
  payment_type VARCHAR(20) DEFAULT 'member_payment', -- member_payment, treasurer_recorded
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE LOAN GUARANTORS TABLE
CREATE TABLE IF NOT EXISTS loan_guarantors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  guarantor_user_id UUID REFERENCES users(id) NOT NULL,
  guarantor_name VARCHAR(255) NOT NULL,
  guarantor_email VARCHAR(255),
  guarantor_phone VARCHAR(50),
  relationship VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, declined
  approval_token UUID DEFAULT gen_random_uuid(),
  signed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ADD NEW COLUMNS TO LOANS TABLE
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS repayment_period_months INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS monthly_installment DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_amount_with_interest DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_repaid DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS first_repayment_date DATE,
ADD COLUMN IF NOT EXISTS final_repayment_date DATE,
ADD COLUMN IF NOT EXISTS repayment_status VARCHAR(20) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requires_guarantor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guarantor_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supporting_documents_urls TEXT[],
ADD COLUMN IF NOT EXISTS expected_repayment_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN loans.interest_rate IS 'Annual interest rate as percentage (e.g., 5.00 for 5%)';
COMMENT ON COLUMN loans.repayment_period_months IS 'Number of months to repay the loan';
COMMENT ON COLUMN loans.monthly_installment IS 'Calculated monthly payment amount';
COMMENT ON COLUMN loans.total_amount_with_interest IS 'Total amount to be repaid including interest';
COMMENT ON COLUMN loans.total_repaid IS 'Total amount repaid so far';
COMMENT ON COLUMN loans.remaining_balance IS 'Amount still owed';
COMMENT ON COLUMN loans.repayment_status IS 'not_started, in_progress, completed, overdue';
COMMENT ON COLUMN loans.is_overdue IS 'True if loan is past final repayment date';

-- 4. UPDATE SYSTEM SETTINGS FOR LOAN LIMITS
INSERT INTO system_settings (setting_key, setting_value)
VALUES 
  ('loan_min_amount', '1000'),
  ('loan_max_amount', '50000'),
  ('loan_max_total_per_member', '100000'),
  ('loan_max_active_per_member', '2'),
  ('loan_default_interest_rate', '5.00'),
  ('loan_default_period_months', '6'),
  ('loan_requires_guarantor_threshold', '10000'),
  ('loan_grace_period_days', '7')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value;

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_payment_date ON loan_repayments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_loan_guarantors_loan_id ON loan_guarantors(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_guarantors_user_id ON loan_guarantors(guarantor_user_id);
CREATE INDEX IF NOT EXISTS idx_loan_guarantors_status ON loan_guarantors(status);
CREATE INDEX IF NOT EXISTS idx_loans_repayment_status ON loans(repayment_status);
CREATE INDEX IF NOT EXISTS idx_loans_is_overdue ON loans(is_overdue) WHERE is_overdue = true;

-- 6. CREATE FUNCTION TO CALCULATE LOAN DETAILS
CREATE OR REPLACE FUNCTION calculate_loan_details(
  p_amount DECIMAL(10, 2),
  p_interest_rate DECIMAL(5, 2),
  p_months INTEGER
)
RETURNS TABLE(
  monthly_payment DECIMAL(10, 2),
  total_payment DECIMAL(10, 2),
  total_interest DECIMAL(10, 2)
) AS $$
DECLARE
  v_monthly_rate DECIMAL(10, 6);
  v_monthly_payment DECIMAL(10, 2);
  v_total_payment DECIMAL(10, 2);
BEGIN
  -- If no interest, simple division
  IF p_interest_rate = 0 THEN
    v_monthly_payment := ROUND(p_amount / p_months, 2);
    v_total_payment := p_amount;
  ELSE
    -- Monthly interest rate
    v_monthly_rate := p_interest_rate / 100 / 12;
    
    -- Calculate monthly payment using loan formula: P * [r(1+r)^n] / [(1+r)^n - 1]
    v_monthly_payment := ROUND(
      p_amount * (v_monthly_rate * POWER(1 + v_monthly_rate, p_months)) / 
      (POWER(1 + v_monthly_rate, p_months) - 1),
      2
    );
    
    v_total_payment := v_monthly_payment * p_months;
  END IF;
  
  RETURN QUERY SELECT 
    v_monthly_payment,
    v_total_payment,
    v_total_payment - p_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. CREATE FUNCTION TO UPDATE LOAN BALANCE
CREATE OR REPLACE FUNCTION update_loan_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_repaid and remaining_balance
  UPDATE loans
  SET 
    total_repaid = COALESCE((
      SELECT SUM(amount)
      FROM loan_repayments
      WHERE loan_id = NEW.loan_id
    ), 0),
    remaining_balance = total_amount_with_interest - COALESCE((
      SELECT SUM(amount)
      FROM loan_repayments
      WHERE loan_id = NEW.loan_id
    ), 0),
    last_payment_date = NEW.payment_date,
    updated_at = NOW()
  WHERE id = NEW.loan_id;
  
  -- Update repayment_status
  UPDATE loans
  SET repayment_status = CASE
    WHEN remaining_balance <= 0 THEN 'completed'
    WHEN total_repaid > 0 THEN 'in_progress'
    ELSE 'not_started'
  END
  WHERE id = NEW.loan_id;
  
  -- Mark as repaid if fully paid
  UPDATE loans
  SET 
    status = 'repaid',
    repaid_at = NOW()
  WHERE id = NEW.loan_id 
  AND remaining_balance <= 0
  AND status = 'disbursed';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. CREATE TRIGGER FOR AUTOMATIC BALANCE UPDATE
DROP TRIGGER IF EXISTS trigger_update_loan_balance ON loan_repayments;
CREATE TRIGGER trigger_update_loan_balance
AFTER INSERT ON loan_repayments
FOR EACH ROW
EXECUTE FUNCTION update_loan_balance();

-- 9. CREATE FUNCTION TO CHECK OVERDUE LOANS
CREATE OR REPLACE FUNCTION check_overdue_loans()
RETURNS void AS $$
BEGIN
  UPDATE loans
  SET 
    is_overdue = true,
    repayment_status = 'overdue',
    updated_at = NOW()
  WHERE status = 'disbursed'
  AND final_repayment_date < CURRENT_DATE
  AND repayment_status NOT IN ('completed', 'overdue')
  AND remaining_balance > 0;
END;
$$ LANGUAGE plpgsql;

-- 10. CREATE VIEW FOR LOAN SUMMARY
CREATE OR REPLACE VIEW loan_summary AS
SELECT 
  l.id,
  l.user_id,
  u.full_name,
  u.email,
  l.amount AS principal_amount,
  l.interest_rate,
  l.repayment_period_months,
  l.total_amount_with_interest,
  l.total_repaid,
  l.remaining_balance,
  l.monthly_installment,
  l.status,
  l.repayment_status,
  l.is_overdue,
  l.first_repayment_date,
  l.final_repayment_date,
  l.last_payment_date,
  l.created_at AS application_date,
  l.disbursed_at,
  COALESCE(
    (SELECT COUNT(*) FROM loan_repayments WHERE loan_id = l.id),
    0
  ) AS payment_count,
  CASE 
    WHEN l.remaining_balance > 0 AND l.final_repayment_date < CURRENT_DATE 
    THEN CURRENT_DATE - l.final_repayment_date
    ELSE 0
  END AS days_overdue
FROM loans l
JOIN users u ON l.user_id = u.id;

-- 11. CREATE FUNCTION TO GET MEMBER LOAN ELIGIBILITY
CREATE OR REPLACE FUNCTION check_member_loan_eligibility(p_user_id UUID)
RETURNS TABLE(
  eligible BOOLEAN,
  reason TEXT,
  details JSONB
) AS $$
DECLARE
  v_settings JSONB;
  v_active_loans INTEGER;
  v_total_borrowed DECIMAL(10, 2);
  v_max_active INTEGER;
  v_max_total DECIMAL(10, 2);
  v_requires_dues BOOLEAN;
  v_min_months INTEGER;
  v_months_member INTEGER;
  v_unpaid_dues INTEGER;
BEGIN
  -- Get all settings
  SELECT jsonb_object_agg(setting_key, setting_value)
  INTO v_settings
  FROM system_settings
  WHERE setting_key IN (
    'loan_max_active_per_member',
    'loan_max_total_per_member',
    'loan_requires_dues_clear',
    'loan_minimum_months'
  );
  
  v_max_active := COALESCE((v_settings->>'loan_max_active_per_member')::INTEGER, 2);
  v_max_total := COALESCE((v_settings->>'loan_max_total_per_member')::DECIMAL, 100000);
  v_requires_dues := COALESCE((v_settings->>'loan_requires_dues_clear')::BOOLEAN, true);
  v_min_months := COALESCE((v_settings->>'loan_minimum_months')::INTEGER, 3);
  
  -- Check active loans count
  SELECT COUNT(*)
  INTO v_active_loans
  FROM loans
  WHERE user_id = p_user_id
  AND status IN ('pending', 'secretary_approved', 'finance_approved', 'disbursed')
  AND repayment_status != 'completed';
  
  IF v_active_loans >= v_max_active THEN
    RETURN QUERY SELECT 
      false,
      'Maximum active loans reached',
      jsonb_build_object(
        'active_loans', v_active_loans,
        'max_allowed', v_max_active
      );
    RETURN;
  END IF;
  
  -- Check total borrowed amount
  SELECT COALESCE(SUM(remaining_balance), 0)
  INTO v_total_borrowed
  FROM loans
  WHERE user_id = p_user_id
  AND status = 'disbursed'
  AND repayment_status != 'completed';
  
  IF v_total_borrowed >= v_max_total THEN
    RETURN QUERY SELECT 
      false,
      'Maximum borrowing limit reached',
      jsonb_build_object(
        'current_total', v_total_borrowed,
        'max_allowed', v_max_total
      );
    RETURN;
  END IF;
  
  -- Check dues if required
  IF v_requires_dues THEN
    SELECT COUNT(*)
    INTO v_unpaid_dues
    FROM payments
    WHERE user_id = p_user_id
    AND status = 'pending';
    
    IF v_unpaid_dues > 0 THEN
      RETURN QUERY SELECT 
        false,
        'Unpaid monthly dues',
        jsonb_build_object(
          'unpaid_months', v_unpaid_dues
        );
      RETURN;
    END IF;
  END IF;
  
  -- Check membership duration
  IF v_min_months > 0 THEN
    SELECT EXTRACT(YEAR FROM AGE(NOW(), created_at)) * 12 + 
           EXTRACT(MONTH FROM AGE(NOW(), created_at))
    INTO v_months_member
    FROM users
    WHERE id = p_user_id;
    
    IF v_months_member < v_min_months THEN
      RETURN QUERY SELECT 
        false,
        'Minimum membership duration not met',
        jsonb_build_object(
          'months_as_member', v_months_member,
          'required_months', v_min_months
        );
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true,
    'Eligible to apply for loan',
    jsonb_build_object(
      'active_loans', v_active_loans,
      'total_borrowed', v_total_borrowed,
      'months_as_member', v_months_member
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 12. UPDATE EXISTING LOANS WITH CALCULATED VALUES
UPDATE loans
SET 
  total_amount_with_interest = amount,
  remaining_balance = amount,
  repayment_status = CASE
    WHEN status = 'repaid' THEN 'completed'
    WHEN status = 'disbursed' THEN 'not_started'
    ELSE 'not_started'
  END
WHERE total_amount_with_interest IS NULL;

-- 13. GRANT PERMISSIONS (adjust based on your RLS policies)
-- These are examples - adjust based on your security requirements
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_guarantors ENABLE ROW LEVEL SECURITY;

-- Allow members to view their own loan repayments
CREATE POLICY "Members can view own loan repayments"
ON loan_repayments FOR SELECT
USING (
  loan_id IN (SELECT id FROM loans WHERE user_id = auth.uid())
);

-- Allow members to insert their own repayments
CREATE POLICY "Members can record own repayments"
ON loan_repayments FOR INSERT
WITH CHECK (
  loan_id IN (SELECT id FROM loans WHERE user_id = auth.uid())
);

-- Allow treasurer/admin to view all repayments
CREATE POLICY "Treasurer/Admin can view all repayments"
ON loan_repayments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin', 'finance', 'secretary')
  )
);

-- Allow treasurer/admin to insert repayments
CREATE POLICY "Treasurer/Admin can record repayments"
ON loan_repayments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin')
  )
);

-- Guarantor policies
CREATE POLICY "Members can view guarantor requests for their loans"
ON loan_guarantors FOR SELECT
USING (
  loan_id IN (SELECT id FROM loans WHERE user_id = auth.uid())
  OR guarantor_user_id = auth.uid()
);

CREATE POLICY "Staff can view all guarantors"
ON loan_guarantors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('secretary', 'finance', 'treasurer', 'admin')
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM (
  VALUES 
    ('loan_repayments'),
    ('loan_guarantors'),
    ('loans')
) AS t(table_name)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = t.table_name
);

-- Check new loan columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'loans'
AND column_name IN (
  'interest_rate',
  'repayment_period_months',
  'total_repaid',
  'remaining_balance',
  'repayment_status'
)
ORDER BY column_name;

-- Check system settings
SELECT setting_key, setting_value
FROM system_settings
WHERE setting_key LIKE 'loan_%'
ORDER BY setting_key;

-- Test loan calculation function
SELECT * FROM calculate_loan_details(10000, 5.00, 12);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON TABLE loan_repayments IS 'Tracks all loan repayment transactions';
COMMENT ON TABLE loan_guarantors IS 'Tracks loan guarantors and their approval status';
COMMENT ON VIEW loan_summary IS 'Comprehensive view of loans with repayment details';
COMMENT ON FUNCTION calculate_loan_details IS 'Calculates monthly payment, total payment, and interest for a loan';
COMMENT ON FUNCTION check_member_loan_eligibility IS 'Checks if a member is eligible to apply for a loan';
COMMENT ON FUNCTION check_overdue_loans IS 'Updates overdue status for loans past their final repayment date';

SELECT '✅ Complete Loan System Migration Successful!' AS status;
