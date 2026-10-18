-- Update member ID format to BULS+YY+MM+XX
-- Format: BULS + last 2 digits of year + month (2 digits) + random 2 digits
-- Example: BULS260145 (joined in January 2026, random 45)
-- Also allows manual ID assignment for past leadership

-- Drop old function
DROP FUNCTION IF EXISTS generate_member_id();

-- Create new function with updated format
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

-- Add function to validate manual member ID
CREATE OR REPLACE FUNCTION validate_member_id(p_member_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if ID is unique
  IF EXISTS(SELECT 1 FROM members_profile WHERE member_id = p_member_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Check if ID follows recommended format (optional, can be bypassed for manual assignment)
  -- IF p_member_id !~ '^BULS\d{6}$' THEN
  --   RETURN FALSE;
  -- END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Migration complete
