-- Create settings table for storing application settings
-- NOTE: Run migration_add_secretary_role.sql FIRST before this migration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Disable RLS for settings table (can be enabled later with proper policies)
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Insert default payment amounts
INSERT INTO settings (key, value) VALUES
  ('payment_amounts', '{"csc": 0, "mofcom": 0, "bilateral": 0, "self": 100, "partial": 50, "other": 100}'::jsonb),
  ('rank_amounts', '{"president": 0, "vice_president": 0, "secretary": 0, "treasurer": 0, "finance": 0, "member": 100}'::jsonb)
ON CONFLICT (key) DO NOTHING;
