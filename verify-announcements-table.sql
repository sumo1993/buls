-- Verify the announcements table exists and has the correct structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'announcements'
ORDER BY 
    ordinal_position;

-- Check if there are any existing announcements
SELECT COUNT(*) as total_announcements FROM announcements;

-- Check the most recent announcements
SELECT 
    id,
    title,
    priority,
    created_at,
    expires_at,
    created_by
FROM 
    announcements
ORDER BY 
    created_at DESC
LIMIT 5;

-- If the table doesn't exist, create it
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Disable RLS if needed
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires_at);
