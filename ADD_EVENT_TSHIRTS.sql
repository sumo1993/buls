-- Event T-shirts (v1–v3 foundation)
-- Run in Supabase SQL Editor
-- v1: toggle + sizes + free/paid + save choice on registration
-- v2: payment approval columns on registration
-- v3: stock limits on event + pickup at check-in

-- ========== events: T-shirt configuration ==========
ALTER TABLE events
ADD COLUMN IF NOT EXISTS tshirt_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_pricing TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS tshirt_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tshirt_sizes TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL', 'XXL'],
ADD COLUMN IF NOT EXISTS tshirt_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_stock JSONB;

-- pricing: free | paid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_tshirt_pricing_check'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_tshirt_pricing_check
    CHECK (tshirt_pricing IS NULL OR tshirt_pricing IN ('free', 'paid'));
  END IF;
END $$;

COMMENT ON COLUMN events.tshirt_enabled IS 'Whether this event offers T-shirts';
COMMENT ON COLUMN events.tshirt_pricing IS 'free or paid';
COMMENT ON COLUMN events.tshirt_price IS 'Unit price when tshirt_pricing = paid';
COMMENT ON COLUMN events.tshirt_sizes IS 'Available sizes, e.g. S,M,L,XL,XXL';
COMMENT ON COLUMN events.tshirt_required IS 'If true, registrants must choose a T-shirt size';
COMMENT ON COLUMN events.tshirt_stock IS 'v3: optional stock map {"S":10,"M":20}; null = unlimited';

-- ========== event_registrations: member T-shirt choice ==========
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS tshirt_wanted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_size TEXT,
ADD COLUMN IF NOT EXISTS tshirt_payment_status TEXT,
ADD COLUMN IF NOT EXISTS tshirt_payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS tshirt_amount_paid NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tshirt_picked_up BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tshirt_picked_up_by UUID REFERENCES users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_registrations_tshirt_payment_status_check'
  ) THEN
    ALTER TABLE event_registrations
    ADD CONSTRAINT event_registrations_tshirt_payment_status_check
    CHECK (
      tshirt_payment_status IS NULL
      OR tshirt_payment_status IN ('waived', 'pending', 'paid', 'refunded')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_registrations_tshirt
ON event_registrations(event_id, tshirt_wanted)
WHERE tshirt_wanted = true;

CREATE INDEX IF NOT EXISTS idx_event_registrations_tshirt_pickup
ON event_registrations(event_id, tshirt_picked_up)
WHERE tshirt_wanted = true;

COMMENT ON COLUMN event_registrations.tshirt_wanted IS 'Member opted in for a T-shirt';
COMMENT ON COLUMN event_registrations.tshirt_size IS 'Selected size';
COMMENT ON COLUMN event_registrations.tshirt_payment_status IS 'waived (free) | pending | paid | refunded (v2)';
COMMENT ON COLUMN event_registrations.tshirt_payment_proof_url IS 'v2: payment proof for paid shirts';
COMMENT ON COLUMN event_registrations.tshirt_amount_paid IS 'v2: amount paid for shirt';
COMMENT ON COLUMN event_registrations.tshirt_picked_up IS 'v3: handed out at event check-in';
COMMENT ON COLUMN event_registrations.tshirt_picked_up_at IS 'v3: when shirt was picked up';
COMMENT ON COLUMN event_registrations.tshirt_picked_up_by IS 'v3: staff who handed out the shirt';

-- Verify
SELECT 'events' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name LIKE 'tshirt_%'
UNION ALL
SELECT 'event_registrations', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'event_registrations'
  AND column_name LIKE 'tshirt_%'
ORDER BY table_name, column_name;
