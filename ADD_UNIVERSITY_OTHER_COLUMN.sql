-- Add university_other column to members_profile table
-- This field stores custom university names when "Other" is selected

ALTER TABLE members_profile 
ADD COLUMN IF NOT EXISTS university_other TEXT;

COMMENT ON COLUMN members_profile.university_other IS 'Custom university name when not in the predefined list';
