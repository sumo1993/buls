-- Create system_settings table for loan requirements and other system settings

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE system_settings IS 'Stores system-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting (e.g., loan_requires_dues_clear)';
COMMENT ON COLUMN system_settings.setting_value IS 'Value of the setting (stored as text, can be parsed as needed)';

-- Insert default loan requirement settings
INSERT INTO system_settings (setting_key, setting_value)
VALUES 
  ('loan_requires_dues_clear', 'true'),
  ('loan_minimum_months', '3')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
