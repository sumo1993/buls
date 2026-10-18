-- Add embassy to user_role enum
-- Prefer running ADD_EMBASSY_CASES.sql which includes this + tables.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'embassy';
