-- T-shirt design photo for events (shown to members / guests / non-members)
-- Run in Supabase SQL Editor

ALTER TABLE events
ADD COLUMN IF NOT EXISTS tshirt_image_url TEXT;

COMMENT ON COLUMN events.tshirt_image_url IS 'Photo of the T-shirt design so registrants can see it before choosing a size';
