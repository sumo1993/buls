-- Add all registration fields to members_profile table

-- Personal Information fields
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS county_of_origin VARCHAR(100);

-- Passport & Travel Document Information
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS passport_issue_date DATE;
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS passport_expiration_date DATE;
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS chinese_visa_expiration_date DATE;

-- Educational Information
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS university_campus VARCHAR(100);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS current_degree_level VARCHAR(50);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS major_program VARCHAR(100);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS expected_graduation_year INTEGER;
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS scholarship_status VARCHAR(50);

-- Contact Information
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS wechat_id VARCHAR(50);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS beijing_address TEXT;

-- Emergency Contact
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS relationship_to_student VARCHAR(50);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS emergency_contact_social VARCHAR(50);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS emergency_contact_country VARCHAR(50);

-- BULS Membership
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS current_buls_member VARCHAR(10);
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS buls_support_areas TEXT[];
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS participate_in_activities TEXT;
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS skills_talents TEXT;

-- Declaration & Consent
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS consent_to_registration BOOLEAN DEFAULT FALSE;
ALTER TABLE members_profile ADD COLUMN IF NOT EXISTS date_of_registration DATE;
