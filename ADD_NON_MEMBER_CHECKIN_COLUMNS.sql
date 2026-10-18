-- Add check-in columns to non_member_registrations (mirrors ticket_guests)
-- Run this in Supabase SQL Editor

ALTER TABLE non_member_registrations
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_non_member_checked_in
ON non_member_registrations(checked_in);

CREATE INDEX IF NOT EXISTS idx_non_member_checked_in_by
ON non_member_registrations(checked_in_by);

COMMENT ON COLUMN non_member_registrations.checked_in IS 'Whether non-member has been checked in at the event';
COMMENT ON COLUMN non_member_registrations.checked_in_at IS 'Timestamp when the non-member was checked in';
COMMENT ON COLUMN non_member_registrations.checked_in_by IS 'User ID (secretary/admin) who performed the check-in';

-- Verify columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'non_member_registrations'
  AND column_name IN ('checked_in', 'checked_in_at', 'checked_in_by')
ORDER BY column_name;
