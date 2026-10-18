-- =====================================================
-- EVENT MANAGEMENT ENHANCEMENTS - DATABASE MIGRATIONS
-- Run this script to add all new event management features
-- =====================================================

-- 1. ADD EVENT STATUS MANAGEMENT
-- Add status field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'upcoming';
-- Values: upcoming, ongoing, completed, cancelled

-- Add cancelled_at and cancelled_by fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. EVENT CHECK-IN SYSTEM
-- Create event_checkins table
CREATE TABLE IF NOT EXISTS event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  registration_id UUID, -- Links to event_registrations or ticket_purchases
  registration_type VARCHAR(20), -- 'registration' or 'ticket_purchase'
  checked_in_at TIMESTAMP DEFAULT NOW(),
  checked_in_by UUID REFERENCES users(id), -- Who checked them in
  check_in_method VARCHAR(20) DEFAULT 'qr_scan', -- qr_scan, manual, self_checkin
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id) -- One check-in per user per event
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user ON event_checkins(user_id);

-- 3. EVENT FEEDBACK/RATINGS SYSTEM
-- Create event_feedback table (if not exists)
CREATE TABLE IF NOT EXISTS event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  feedback_type VARCHAR(20) DEFAULT 'general', -- general, venue, content, organization
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id) -- One feedback per user per event
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_rating ON event_feedback(rating);

-- 4. EVENT CATEGORIES/TAGS SYSTEM
-- Create event_categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color code for UI
  icon VARCHAR(50), -- Icon name for UI
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO event_categories (name, description, color, icon) VALUES
  ('Academic', 'Academic and educational events', '#3B82F6', '🎓'),
  ('Social', 'Social gatherings and networking', '#10B981', '🎉'),
  ('Professional', 'Career and professional development', '#8B5CF6', '💼'),
  ('Cultural', 'Cultural celebrations and activities', '#F59E0B', '🎭'),
  ('Sports', 'Sports and fitness activities', '#EF4444', '⚽'),
  ('Community Service', 'Volunteer and service activities', '#06B6D4', '🤝'),
  ('Workshop', 'Skills training and workshops', '#EC4899', '🛠️')
ON CONFLICT (name) DO NOTHING;

-- Create event_category_mappings junction table
CREATE TABLE IF NOT EXISTS event_category_mappings (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES event_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_event_categories_mapping ON event_category_mappings(event_id);

-- 5. RECURRING EVENTS SYSTEM
-- Add recurring fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20); -- daily, weekly, monthly, yearly
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1; -- Every X days/weeks/months
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id INTEGER REFERENCES events(id); -- For event series
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_exceptions TEXT[]; -- Array of dates to skip

-- 6. EVENT REMINDERS/NOTIFICATIONS
-- Create event_reminders table
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(30), -- 7_days_before, 1_day_before, 2_hours_before, registration_deadline
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  notification_channel VARCHAR(20) DEFAULT 'email', -- email, sms, push
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_scheduled ON event_reminders(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON event_reminders(event_id);

-- 7. EVENT WAITLIST ENHANCEMENTS
-- Add waitlist position tracking to event_registrations
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS promoted_from_waitlist_at TIMESTAMP;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS waitlist_notified_at TIMESTAMP;

-- 8. EVENT CO-HOSTS/COLLABORATORS
-- Create event_collaborators table
CREATE TABLE IF NOT EXISTS event_collaborators (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'co_host', -- co_host, organizer, helper
  permissions TEXT[], -- Array of permissions: edit, delete, manage_registrations, check_in
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_collaborators_event ON event_collaborators(event_id);

-- 9. EVENT CERTIFICATES
-- Create event_certificates table
CREATE TABLE IF NOT EXISTS event_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  certificate_type VARCHAR(30) DEFAULT 'attendance', -- attendance, participation, achievement, speaker
  certificate_number VARCHAR(50) UNIQUE,
  issued_at TIMESTAMP DEFAULT NOW(),
  issued_by UUID REFERENCES users(id),
  certificate_url TEXT, -- URL to generated certificate PDF
  hours_credited DECIMAL(5,2), -- Professional development hours
  custom_text TEXT, -- Custom certificate text
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_certificates_event ON event_certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_certificates_user ON event_certificates(user_id);

-- 10. EVENT ANALYTICS
-- Create event_analytics view (computed data)
CREATE OR REPLACE VIEW event_analytics AS
SELECT 
  e.id AS event_id,
  e.title,
  e.event_date,
  e.status,
  e.capacity,
  
  -- Registration stats
  COUNT(DISTINCT er.id) AS registration_count,
  COUNT(DISTINCT CASE WHEN er.status = 'registered' THEN er.id END) AS confirmed_registrations,
  COUNT(DISTINCT CASE WHEN er.status = 'waitlist' THEN er.id END) AS waitlist_count,
  
  -- Ticket stats
  COUNT(DISTINCT tp.id) AS ticket_purchase_count,
  COALESCE(SUM(tp.quantity), 0) AS total_tickets_sold,
  COALESCE(SUM(tp.total_price), 0) AS total_revenue,
  
  -- Check-in stats
  COUNT(DISTINCT ec.id) AS checked_in_count,
  CASE 
    WHEN COUNT(DISTINCT er.id) + COUNT(DISTINCT tp.id) > 0 
    THEN (COUNT(DISTINCT ec.id)::FLOAT / (COUNT(DISTINCT er.id) + COUNT(DISTINCT tp.id))) * 100
    ELSE 0
  END AS attendance_rate,
  
  -- Feedback stats
  COUNT(DISTINCT ef.id) AS feedback_count,
  ROUND(AVG(ef.rating), 2) AS average_rating,
  
  -- Certificate stats
  COUNT(DISTINCT cert.id) AS certificates_issued
  
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
LEFT JOIN ticket_purchases tp ON e.id = tp.event_id AND tp.payment_status = 'paid'
LEFT JOIN event_checkins ec ON e.id = ec.event_id
LEFT JOIN event_feedback ef ON e.id = ef.event_id
LEFT JOIN event_certificates cert ON e.id = cert.event_id
GROUP BY e.id, e.title, e.event_date, e.status, e.capacity;

-- =====================================================
-- IMPORTANT: Run this entire script in your Supabase SQL editor
-- =====================================================

-- Add helpful comments
COMMENT ON TABLE event_checkins IS 'Tracks event attendance and check-ins';
COMMENT ON TABLE event_feedback IS 'Stores member feedback and ratings for events';
COMMENT ON TABLE event_categories IS 'Event categories/tags for organization';
COMMENT ON TABLE event_reminders IS 'Automated reminder system for events';
COMMENT ON TABLE event_collaborators IS 'Event co-hosts and organizers';
COMMENT ON TABLE event_certificates IS 'Generated certificates for event attendees';
COMMENT ON VIEW event_analytics IS 'Computed analytics data for all events';

-- Grant permissions (adjust based on your RLS policies)
-- These are examples - modify based on your security requirements
-- GRANT SELECT ON event_analytics TO authenticated;
-- GRANT ALL ON event_checkins TO authenticated;
-- GRANT ALL ON event_feedback TO authenticated;
-- GRANT SELECT ON event_categories TO authenticated;
