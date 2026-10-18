-- Event venue format: in-person, online (Zoom/Teams/etc.), or hybrid
-- Run in Supabase SQL Editor

ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_format TEXT DEFAULT 'in_person',
ADD COLUMN IF NOT EXISTS online_link TEXT,
ADD COLUMN IF NOT EXISTS online_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS online_password TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_event_format_check'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_event_format_check
    CHECK (
      event_format IS NULL
      OR event_format IN ('in_person', 'online', 'hybrid')
    );
  END IF;
END $$;

COMMENT ON COLUMN events.event_format IS 'Where the event happens: in_person | online | hybrid';
COMMENT ON COLUMN events.online_link IS 'Zoom / Teams / Meet join URL for online or hybrid events';
COMMENT ON COLUMN events.online_meeting_id IS 'Optional meeting ID shown to members';
COMMENT ON COLUMN events.online_password IS 'Optional meeting password';
