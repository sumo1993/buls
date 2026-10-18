-- =====================================================
-- ADD CHINESE_PHONE_NUMBER COLUMN TO MEMBERS_PROFILE
-- =====================================================

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS chinese_phone_number VARCHAR(20);

-- =====================================================
-- COLUMN ADDED
-- =====================================================
