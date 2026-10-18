-- Liberian Student Union Beijing Management System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('birthday-photos', 'birthday-photos', true) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage and create permissive policies for payment-proofs
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access Policy" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Access Policy" ON storage.objects;

-- Create permissive policy for payment-proofs bucket
CREATE POLICY "Allow all access to payment-proofs" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'payment-proofs') 
WITH CHECK (bucket_id = 'payment-proofs');

-- Create permissive policy for member-photos bucket
CREATE POLICY "Allow all access to member-photos" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'member-photos') 
WITH CHECK (bucket_id = 'member-photos');

-- Create permissive policy for birthday-photos bucket
CREATE POLICY "Allow all access to birthday-photos" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'birthday-photos') 
WITH CHECK (bucket_id = 'birthday-photos');

-- Create reference code counter table (no RLS)
CREATE TABLE IF NOT EXISTS reference_code_counters (
  year INTEGER NOT NULL,
  month TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (year, month)
);

-- Disable RLS on this table completely
ALTER TABLE reference_code_counters DISABLE ROW LEVEL SECURITY;

-- Function to generate unique reference code for payments
CREATE OR REPLACE FUNCTION generate_reference_code(p_year INTEGER, p_month TEXT)
RETURNS TEXT AS $$
DECLARE
  month_num TEXT;
  sequence_num TEXT;
  new_reference_code TEXT;
BEGIN
  -- Convert month name to number
  month_num := LPAD(
    CASE p_month
      WHEN 'January' THEN '01'
      WHEN 'February' THEN '02'
      WHEN 'March' THEN '03'
      WHEN 'April' THEN '04'
      WHEN 'May' THEN '05'
      WHEN 'June' THEN '06'
      WHEN 'July' THEN '07'
      WHEN 'August' THEN '08'
      WHEN 'September' THEN '09'
      WHEN 'October' THEN '10'
      WHEN 'November' THEN '11'
      WHEN 'December' THEN '12'
    END, 2, '0'
  );
  
  -- Increment counter for this month/year
  INSERT INTO reference_code_counters (year, month, counter)
  VALUES (p_year, p_month, 1)
  ON CONFLICT (year, month) 
  DO UPDATE SET counter = reference_code_counters.counter + 1
  RETURNING counter INTO sequence_num;
  
  -- If the row already existed, get the updated counter
  IF sequence_num IS NULL THEN
    SELECT counter INTO sequence_num
    FROM reference_code_counters
    WHERE year = p_year AND month = p_month;
  END IF;
  
  new_reference_code := 'BULS-' || p_year || '-' || month_num || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN new_reference_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'finance', 'treasurer', 'member');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'transferred', 'dropped', 'graduated');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_method AS ENUM ('wechat', 'alipay', 'bank');
CREATE TYPE scholarship_type AS ENUM ('self_support', 'government', 'other');
CREATE TYPE loan_status AS ENUM ('pending', 'approved', 'rejected', 'repaid');
CREATE TYPE action_type AS ENUM (
  'payment_approved', 
  'payment_rejected', 
  'user_approved', 
  'user_rejected',
  'loan_approved', 
  'loan_rejected',
  'loan_repaid',
  'role_changed',
  'status_changed'
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role DEFAULT 'member',
  status user_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members profile table
CREATE TABLE members_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_id TEXT UNIQUE NOT NULL,
  photo_url TEXT,
  age INTEGER,
  phone TEXT,
  university TEXT,
  address TEXT,
  scholarship_type scholarship_type,
  monthly_due_amount DECIMAL(10, 2) DEFAULT 100.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- 'January', 'February', etc.
  year INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  proof_url TEXT NOT NULL,
  reference_code TEXT UNIQUE NOT NULL,
  status payment_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  status loan_status DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  repaid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type action_type NOT NULL,
  performed_by UUID REFERENCES users(id),
  target_id UUID,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_members_profile_user_id ON members_profile(user_id);
CREATE INDEX idx_members_profile_member_id ON members_profile(member_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_year_month ON payments(year, month);
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Function to generate member ID
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TEXT AS $$
DECLARE
  year_suffix TEXT;
  month_num TEXT;
  random_digits TEXT;
  new_member_id TEXT;
  is_unique BOOLEAN;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YY');
  month_num := TO_CHAR(NOW(), 'MM');
  
  -- Generate unique ID with random 2 digits
  is_unique := FALSE;
  WHILE NOT is_unique LOOP
    random_digits := LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0');
    new_member_id := 'BULS' || year_suffix || month_num || random_digits;
    
    -- Check if this ID already exists
    SELECT NOT EXISTS(SELECT 1 FROM members_profile WHERE member_id = new_member_id)
    INTO is_unique;
  END LOOP;
  
  RETURN new_member_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique reference code for payments
CREATE OR REPLACE FUNCTION generate_reference_code(p_year INTEGER, p_month TEXT)
RETURNS TEXT AS $$
DECLARE
  month_num TEXT;
  sequence_num TEXT;
  new_reference_code TEXT;
BEGIN
  -- Convert month name to number
  month_num := LPAD(
    CASE p_month
      WHEN 'January' THEN '01'
      WHEN 'February' THEN '02'
      WHEN 'March' THEN '03'
      WHEN 'April' THEN '04'
      WHEN 'May' THEN '05'
      WHEN 'June' THEN '06'
      WHEN 'July' THEN '07'
      WHEN 'August' THEN '08'
      WHEN 'September' THEN '09'
      WHEN 'October' THEN '10'
      WHEN 'November' THEN '11'
      WHEN 'December' THEN '12'
    END, 2, '0'
  );
  
  -- Get sequence number for this month/year (bypass RLS)
  SELECT LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO sequence_num
  FROM payments
  WHERE year = p_year AND month = p_month;
  
  new_reference_code := 'BULS-' || p_year || '-' || month_num || '-' || sequence_num;
  
  RETURN new_reference_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check unpaid months for a user
CREATE OR REPLACE FUNCTION has_unpaid_months(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_year INTEGER;
  current_month INTEGER;
  unpaid_count INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());
  current_month := EXTRACT(MONTH FROM NOW());
  
  -- Count unpaid months up to current month
  SELECT COUNT(*)
  INTO unpaid_count
  FROM generate_series(1, current_month) AS month_num
  WHERE NOT EXISTS (
    SELECT 1 FROM payments
    WHERE user_id = p_user_id
    AND year = current_year
    AND month = (
      CASE month_num
        WHEN 1 THEN 'January'
        WHEN 2 THEN 'February'
        WHEN 3 THEN 'March'
        WHEN 4 THEN 'April'
        WHEN 5 THEN 'May'
        WHEN 6 THEN 'June'
        WHEN 7 THEN 'July'
        WHEN 8 THEN 'August'
        WHEN 9 THEN 'September'
        WHEN 10 THEN 'October'
        WHEN 11 THEN 'November'
        WHEN 12 THEN 'December'
      END
    )
    AND status IN ('approved', 'collected')  -- Accept both collected and approved payments
  );
  
  RETURN unpaid_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_profile_updated_at BEFORE UPDATE ON members_profile
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
