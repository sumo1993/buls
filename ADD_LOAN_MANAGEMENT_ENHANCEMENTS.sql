-- ============================================
-- LOAN MANAGEMENT ENHANCEMENTS
-- Adds payment verification, reminders, contacts tracking
-- ============================================

-- 1. CREATE PAYMENT VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repayment_id UUID REFERENCES loan_repayments(id) ON DELETE CASCADE NOT NULL,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE payment_verifications IS 'Tracks verification status of member-submitted payments';
COMMENT ON COLUMN payment_verifications.verification_status IS 'pending, verified, rejected';

-- 2. CREATE PAYMENT REMINDERS TABLE
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  reminder_type VARCHAR(50) NOT NULL, -- before_due, on_due, overdue_3, overdue_7, overdue_14, manual
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID REFERENCES users(id),
  sent_to UUID REFERENCES users(id) NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, failed, read
  delivery_method VARCHAR(20) DEFAULT 'email', -- email, sms, both
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE payment_reminders IS 'Tracks payment reminders sent to members';
COMMENT ON COLUMN payment_reminders.reminder_type IS 'before_due, on_due, overdue_3, overdue_7, overdue_14, manual';

-- 3. CREATE LOAN CONTACTS TABLE
CREATE TABLE IF NOT EXISTS loan_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  contacted_by UUID REFERENCES users(id) NOT NULL,
  contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contact_method VARCHAR(50) NOT NULL, -- email, phone, sms, in_person, video_call
  contact_purpose VARCHAR(100), -- reminder, follow_up, inquiry, resolution
  notes TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  outcome VARCHAR(50), -- promised_payment, dispute, no_response, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE loan_contacts IS 'Tracks all contact attempts with borrowers';
COMMENT ON COLUMN loan_contacts.contact_method IS 'email, phone, sms, in_person, video_call';

-- 4. ADD VERIFICATION COLUMN TO LOAN_REPAYMENTS
ALTER TABLE loan_repayments
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN loan_repayments.verification_status IS 'pending, verified, rejected - for treasurer verification';

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_payment_verifications_repayment ON payment_verifications(repayment_id);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_status ON payment_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_loan ON payment_reminders(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_to ON payment_reminders(sent_to);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_type ON payment_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_loan_contacts_loan ON loan_contacts(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_contacts_date ON loan_contacts(contact_date DESC);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_verification ON loan_repayments(verification_status);

-- 6. CREATE FUNCTION TO GET LOAN STATISTICS
CREATE OR REPLACE FUNCTION get_loan_statistics()
RETURNS TABLE(
  total_applications BIGINT,
  pending_secretary BIGINT,
  pending_finance BIGINT,
  approved_loans BIGINT,
  disbursed_loans BIGINT,
  repaid_loans BIGINT,
  overdue_loans BIGINT,
  rejected_loans BIGINT,
  total_amount_disbursed DECIMAL(12, 2),
  total_amount_repaid DECIMAL(12, 2),
  total_outstanding DECIMAL(12, 2),
  average_loan_amount DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_applications,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_secretary,
    COUNT(*) FILTER (WHERE status = 'secretary_approved')::BIGINT AS pending_finance,
    COUNT(*) FILTER (WHERE status IN ('finance_approved', 'disbursed', 'repaid'))::BIGINT AS approved_loans,
    COUNT(*) FILTER (WHERE status = 'disbursed')::BIGINT AS disbursed_loans,
    COUNT(*) FILTER (WHERE status = 'repaid')::BIGINT AS repaid_loans,
    COUNT(*) FILTER (WHERE is_overdue = true)::BIGINT AS overdue_loans,
    COUNT(*) FILTER (WHERE status LIKE '%rejected%')::BIGINT AS rejected_loans,
    COALESCE(SUM(amount) FILTER (WHERE status IN ('disbursed', 'repaid')), 0)::DECIMAL(12, 2) AS total_amount_disbursed,
    COALESCE(SUM(total_repaid) FILTER (WHERE status IN ('disbursed', 'repaid')), 0)::DECIMAL(12, 2) AS total_amount_repaid,
    COALESCE(SUM(remaining_balance) FILTER (WHERE status = 'disbursed' AND repayment_status != 'completed'), 0)::DECIMAL(12, 2) AS total_outstanding,
    COALESCE(AVG(amount) FILTER (WHERE status IN ('disbursed', 'repaid')), 0)::DECIMAL(10, 2) AS average_loan_amount
  FROM loans;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. CREATE FUNCTION TO GET OVERDUE LOANS
CREATE OR REPLACE FUNCTION get_overdue_loans()
RETURNS TABLE(
  loan_id UUID,
  user_id UUID,
  member_name TEXT,
  member_email TEXT,
  loan_amount DECIMAL(10, 2),
  remaining_balance DECIMAL(10, 2),
  final_repayment_date DATE,
  days_overdue INTEGER,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_contact_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id AS loan_id,
    l.user_id,
    u.full_name AS member_name,
    u.email AS member_email,
    l.amount AS loan_amount,
    l.remaining_balance,
    l.final_repayment_date,
    (CURRENT_DATE - l.final_repayment_date)::INTEGER AS days_overdue,
    l.last_payment_date,
    (SELECT MAX(contact_date) FROM loan_contacts WHERE loan_id = l.id) AS last_contact_date
  FROM loans l
  JOIN users u ON l.user_id = u.id
  WHERE l.status = 'disbursed'
    AND l.is_overdue = true
    AND l.remaining_balance > 0
  ORDER BY days_overdue DESC, remaining_balance DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. CREATE FUNCTION TO GET ALL REPAYMENTS WITH DETAILS
CREATE OR REPLACE FUNCTION get_all_repayments(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE(
  repayment_id UUID,
  loan_id UUID,
  member_name TEXT,
  member_email TEXT,
  amount DECIMAL(10, 2),
  payment_method VARCHAR(50),
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_type VARCHAR(20),
  verification_status VARCHAR(20),
  verified_by_name TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  payment_proof_url TEXT,
  notes TEXT,
  loan_amount DECIMAL(10, 2),
  remaining_balance DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lr.id AS repayment_id,
    lr.loan_id,
    u.full_name AS member_name,
    u.email AS member_email,
    lr.amount,
    lr.payment_method,
    lr.payment_date,
    lr.payment_type,
    lr.verification_status,
    v.full_name AS verified_by_name,
    lr.verified_at,
    lr.payment_proof_url,
    lr.notes,
    l.amount AS loan_amount,
    l.remaining_balance
  FROM loan_repayments lr
  JOIN loans l ON lr.loan_id = l.id
  JOIN users u ON l.user_id = u.id
  LEFT JOIN users v ON lr.verified_by = v.id
  ORDER BY lr.payment_date DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. CREATE FUNCTION TO LOG LOAN CONTACT
CREATE OR REPLACE FUNCTION log_loan_contact(
  p_loan_id UUID,
  p_contacted_by UUID,
  p_contact_method VARCHAR(50),
  p_contact_purpose VARCHAR(100),
  p_notes TEXT,
  p_follow_up_required BOOLEAN DEFAULT false,
  p_follow_up_date DATE DEFAULT NULL,
  p_outcome VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  INSERT INTO loan_contacts (
    loan_id,
    contacted_by,
    contact_method,
    contact_purpose,
    notes,
    follow_up_required,
    follow_up_date,
    outcome
  ) VALUES (
    p_loan_id,
    p_contacted_by,
    p_contact_method,
    p_contact_purpose,
    p_notes,
    p_follow_up_required,
    p_follow_up_date,
    p_outcome
  )
  RETURNING id INTO v_contact_id;
  
  RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- 10. CREATE VIEW FOR REPAYMENT DASHBOARD
CREATE OR REPLACE VIEW repayment_dashboard AS
SELECT 
  l.id AS loan_id,
  l.user_id,
  u.full_name AS member_name,
  u.email AS member_email,
  l.amount AS loan_amount,
  l.interest_rate,
  l.total_amount_with_interest,
  l.total_repaid,
  l.remaining_balance,
  l.monthly_installment,
  l.repayment_period_months,
  l.first_repayment_date,
  l.final_repayment_date,
  l.status AS loan_status,
  l.repayment_status,
  l.is_overdue,
  l.last_payment_date,
  l.disbursed_at,
  CASE 
    WHEN l.final_repayment_date < CURRENT_DATE THEN (CURRENT_DATE - l.final_repayment_date)::INTEGER
    ELSE 0
  END AS days_overdue,
  CASE
    WHEN l.total_amount_with_interest > 0 
    THEN ROUND((l.total_repaid / l.total_amount_with_interest * 100)::NUMERIC, 1)
    ELSE 0
  END AS repayment_percentage,
  (SELECT COUNT(*) FROM loan_repayments WHERE loan_id = l.id) AS payment_count,
  (SELECT MAX(contact_date) FROM loan_contacts WHERE loan_id = l.id) AS last_contact_date
FROM loans l
JOIN users u ON l.user_id = u.id
WHERE l.status IN ('disbursed', 'repaid')
ORDER BY l.is_overdue DESC, l.remaining_balance DESC;

COMMENT ON VIEW repayment_dashboard IS 'Comprehensive view for loan repayment tracking';

-- 11. GRANT PERMISSIONS
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_contacts ENABLE ROW LEVEL SECURITY;

-- Allow staff to view verifications
CREATE POLICY "Staff can view payment verifications"
ON payment_verifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin', 'finance', 'secretary')
  )
);

-- Allow treasurer/admin to manage verifications
CREATE POLICY "Treasurer/Admin can manage verifications"
ON payment_verifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin')
  )
);

-- Allow staff to view reminders
CREATE POLICY "Staff can view reminders"
ON payment_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin', 'finance', 'secretary')
  )
  OR sent_to = auth.uid()
);

-- Allow treasurer/admin to send reminders
CREATE POLICY "Treasurer/Admin can send reminders"
ON payment_reminders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin')
  )
);

-- Allow staff to view contacts
CREATE POLICY "Staff can view loan contacts"
ON loan_contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin', 'finance', 'secretary')
  )
);

-- Allow staff to log contacts
CREATE POLICY "Staff can log contacts"
ON loan_contacts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'admin', 'finance', 'secretary')
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('payment_verifications', 'payment_reminders', 'loan_contacts');

-- Check functions created
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('get_loan_statistics', 'get_overdue_loans', 'get_all_repayments', 'log_loan_contact');

-- Check view created
SELECT table_name FROM information_schema.views 
WHERE table_name = 'repayment_dashboard';

-- Test statistics function
SELECT * FROM get_loan_statistics();

-- Test overdue function  
SELECT * FROM get_overdue_loans() LIMIT 5;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Loan Management Enhancements Migration Successful!' AS status;
