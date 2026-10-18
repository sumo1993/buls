-- Guest T-shirts (selected in Register modal, paid with the ticket purchase)
-- Run in Supabase SQL Editor

ALTER TABLE ticket_guests
ADD COLUMN IF NOT EXISTS tshirt_wanted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_size TEXT,
ADD COLUMN IF NOT EXISTS tshirt_payment_status TEXT,
ADD COLUMN IF NOT EXISTS tshirt_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tshirt_picked_up BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_picked_up_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_guests_tshirt_payment_status_check'
  ) THEN
    ALTER TABLE ticket_guests
    ADD CONSTRAINT ticket_guests_tshirt_payment_status_check
    CHECK (
      tshirt_payment_status IS NULL
      OR tshirt_payment_status IN ('waived', 'pending', 'paid', 'refunded')
    );
  END IF;
END $$;

COMMENT ON COLUMN ticket_guests.tshirt_wanted IS 'Guest opted in for an event T-shirt at Register';
COMMENT ON COLUMN ticket_guests.tshirt_size IS 'Guest T-shirt size';
COMMENT ON COLUMN ticket_guests.tshirt_payment_status IS 'waived | pending | paid | refunded';
COMMENT ON COLUMN ticket_guests.tshirt_amount IS 'Shirt unit price included in the combined purchase total';
