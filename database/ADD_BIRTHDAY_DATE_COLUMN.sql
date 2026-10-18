-- =====================================================
-- ADD MISSING COLUMNS TO BIRTHDAY_PHOTOS TABLE
-- =====================================================
-- This adds the missing birthday_date and status columns
-- =====================================================

ALTER TABLE birthday_photos 
ADD COLUMN IF NOT EXISTS birthday_date DATE;

ALTER TABLE birthday_photos 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- =====================================================
-- COLUMNS ADDED
-- =====================================================
