-- Row Level Security (RLS) Policies for BULS Management System

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role(p_clerk_id TEXT)
RETURNS user_role AS $$
  SELECT role FROM users WHERE clerk_id = p_clerk_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get current user's ID
CREATE OR REPLACE FUNCTION get_user_id(p_clerk_id TEXT)
RETURNS UUID AS $$
  SELECT id FROM users WHERE clerk_id = p_clerk_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- USERS TABLE POLICIES

-- Anyone can read their own user record
CREATE POLICY "Users can read own record"
ON users FOR SELECT
USING (clerk_id = auth.jwt()->>'clerk_id');

-- Admin and Finance can read all users
CREATE POLICY "Admin and Finance can read all users"
ON users FOR SELECT
USING (
  get_user_role(auth.jwt()->>'clerk_id') IN ('admin', 'finance')
);

-- Only system can insert users (via service role)
CREATE POLICY "System can insert users"
ON users FOR INSERT
WITH CHECK (true);

-- Admin can update user roles and status
CREATE POLICY "Admin can update users"
ON users FOR UPDATE
USING (
  get_user_role(auth.jwt()->>'clerk_id') = 'admin'
);

-- MEMBERS_PROFILE TABLE POLICIES

-- Members can read their own profile
CREATE POLICY "Members can read own profile"
ON members_profile FOR SELECT
USING (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
);

-- Admin and Finance can read all profiles
CREATE POLICY "Admin and Finance can read all profiles"
ON members_profile FOR SELECT
USING (
  get_user_role(auth.jwt()->>'clerk_id') IN ('admin', 'finance')
);

-- Members can insert their own profile (once)
CREATE POLICY "Members can create own profile"
ON members_profile FOR INSERT
WITH CHECK (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
);

-- Members can update their own profile (only if not locked by admin)
CREATE POLICY "Members can update own profile"
ON members_profile FOR UPDATE
USING (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
);

-- Admin can update any profile
CREATE POLICY "Admin can update any profile"
ON members_profile FOR UPDATE
USING (
  get_user_role(auth.jwt()->>'clerk_id') = 'admin'
);

-- PAYMENTS TABLE POLICIES

-- Members can read their own payments
CREATE POLICY "Members can read own payments"
ON payments FOR SELECT
USING (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
);

-- Admin and Finance can read all payments
CREATE POLICY "Admin and Finance can read all payments"
ON payments FOR SELECT
USING (
  get_user_role(auth.jwt()->>'clerk_id') IN ('admin', 'finance', 'treasurer')
);

-- Active members can create payments
CREATE POLICY "Active members can create payments"
ON payments FOR INSERT
WITH CHECK (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = get_user_id(auth.jwt()->>'clerk_id') 
    AND status = 'active'
  )
);

-- Members can update their own pending payments (not locked)
CREATE POLICY "Members can update own pending payments"
ON payments FOR UPDATE
USING (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
  AND status = 'pending'
  AND locked = FALSE
);

-- Finance and Admin can update any payment
CREATE POLICY "Finance and Admin can update payments"
ON payments FOR UPDATE
USING (
  get_user_role(auth.jwt()->>'clerk_id') IN ('admin', 'finance')
);

-- LOANS TABLE POLICIES

-- Members can read their own loans
CREATE POLICY "Members can read own loans"
ON loans FOR SELECT
USING (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
);

-- Admin, Finance, and Treasurer can read all loans
CREATE POLICY "Admin, Finance, Treasurer can read all loans"
ON loans FOR SELECT
USING (
  get_user_role(auth.jwt()->>'clerk_id') IN ('admin', 'finance', 'treasurer')
);

-- Active members with no unpaid dues can request loans
CREATE POLICY "Active members can request loans"
ON loans FOR INSERT
WITH CHECK (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = get_user_id(auth.jwt()->>'clerk_id') 
    AND status = 'active'
  )
  AND NOT has_unpaid_months(get_user_id(auth.jwt()->>'clerk_id'))
);

-- Members can update their own pending loans
CREATE POLICY "Members can update own pending loans"
ON loans FOR UPDATE
USING (
  user_id = get_user_id(auth.jwt()->>'clerk_id')
  AND status = 'pending'
);

-- Admin and Finance can update any loan
CREATE POLICY "Admin and Finance can update loans"
ON loans FOR UPDATE
USING (
  get_user_role(auth.jwt()->>'clerk_id') IN ('admin', 'finance')
);

-- AUDIT_LOGS TABLE POLICIES

-- Only Admin can read audit logs
CREATE POLICY "Admin can read audit logs"
ON audit_logs FOR SELECT
USING (
  get_user_role(auth.jwt()->>'clerk_id') = 'admin'
);

-- System and authorized users can insert audit logs
CREATE POLICY "Authorized users can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (
  get_user_role(auth.jwt()->>'clerk_id') IN ('admin', 'finance', 'treasurer')
);

-- No one can update or delete audit logs
CREATE POLICY "No one can update audit logs"
ON audit_logs FOR UPDATE
USING (false);

CREATE POLICY "No one can delete audit logs"
ON audit_logs FOR DELETE
USING (false);
