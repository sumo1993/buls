-- Add repost columns to birthday_photos table

ALTER TABLE birthday_photos
ADD COLUMN IF NOT EXISTS is_reposted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reposted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reposted_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying reposted photos
CREATE INDEX IF NOT EXISTS idx_birthday_photos_reposted 
ON birthday_photos(is_reposted) 
WHERE is_reposted = TRUE;

-- Add comment
COMMENT ON COLUMN birthday_photos.is_reposted IS 'Whether this photo has been reposted for all members to see';
COMMENT ON COLUMN birthday_photos.reposted_by IS 'User ID of secretary/admin who reposted the photo';
COMMENT ON COLUMN birthday_photos.reposted_at IS 'Timestamp when the photo was reposted';
