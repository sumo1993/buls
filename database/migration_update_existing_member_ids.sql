-- Update all existing member IDs to new BULS+YY+MM+XX format
-- This script will assign new IDs to all existing members based on their registration date

DO $$
DECLARE
  member_record RECORD;
  new_member_id TEXT;
  year_suffix TEXT;
  month_num TEXT;
  random_digits TEXT;
  is_unique BOOLEAN;
BEGIN
  -- Loop through all members without the new format ID
  FOR member_record IN 
    SELECT id, member_id, created_at 
    FROM members_profile 
    WHERE member_id NOT LIKE 'BULS%'
  LOOP
    year_suffix := TO_CHAR(member_record.created_at, 'YY');
    month_num := TO_CHAR(member_record.created_at, 'MM');
    
    -- Generate unique ID with random 2 digits
    is_unique := FALSE;
    WHILE NOT is_unique LOOP
      random_digits := LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0');
      new_member_id := 'BULS' || year_suffix || month_num || random_digits;
      
      -- Check if this ID already exists
      SELECT NOT EXISTS(SELECT 1 FROM members_profile WHERE member_id = new_member_id)
      INTO is_unique;
    END LOOP;
    
    -- Update the member record
    UPDATE members_profile 
    SET member_id = new_member_id 
    WHERE id = member_record.id;
    
    RAISE NOTICE 'Updated member % from % to %', member_record.id, member_record.member_id, new_member_id;
  END LOOP;
  
  RAISE NOTICE 'Member ID update complete';
END $$;

-- Verify the update
SELECT member_id, created_at 
FROM members_profile 
ORDER BY created_at DESC;
