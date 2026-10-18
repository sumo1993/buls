-- =====================================================
-- ADD MISSING COLUMNS TO MEMBERS_PROFILE
-- =====================================================

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS county_of_origin VARCHAR(100);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS email_address VARCHAR(255);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS chinese_phone_number VARCHAR(20);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS wechat_id VARCHAR(100);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS beijing_address TEXT;

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS home_address TEXT;

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS university_campus VARCHAR(255);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS student_id VARCHAR(100);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(50);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS expected_graduation_year VARCHAR(10);

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS scholarship_status VARCHAR(50);

-- =====================================================
-- ADD MISSING COLUMNS TO BIRTHDAY_PHOTOS
-- =====================================================

ALTER TABLE birthday_photos 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE birthday_photos 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE birthday_photos 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =====================================================
-- COLUMNS ADDED
-- =====================================================
