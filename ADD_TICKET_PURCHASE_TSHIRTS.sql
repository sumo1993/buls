-- T-shirt v2: store shirt choice + payment on ticket purchases
-- (combined payment with ticket: total_price = ticket + shirt)
-- Run in Supabase SQL Editor

ALTER TABLE ticket_purchases
ADD COLUMN IF NOT EXISTS tshirt_wanted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_size TEXT,
ADD COLUMN IF NOT EXISTS tshirt_payment_status TEXT,
ADD COLUMN IF NOT EXISTS tshirt_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS tshirt_picked_up BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tshirt_picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tshirt_picked_up_by UUID REFERENCES users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_purchases_tshirt_payment_status_check'
  ) THEN
    ALTER TABLE ticket_purchases
    ADD CONSTRAINT ticket_purchases_tshirt_payment_status_check
    CHECK (
      tshirt_payment_status IS NULL
      OR tshirt_payment_status IN ('waived', 'pending', 'paid', 'refunded')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_tshirt
ON ticket_purchases(event_id, tshirt_wanted)
WHERE tshirt_wanted = true;

COMMENT ON COLUMN ticket_purchases.tshirt_wanted IS 'Buyer opted in for a T-shirt';
COMMENT ON COLUMN ticket_purchases.tshirt_size IS 'Selected size';
COMMENT ON COLUMN ticket_purchases.tshirt_payment_status IS 'waived | pending | paid | refunded';
COMMENT ON COLUMN ticket_purchases.tshirt_amount IS 'Shirt portion included in total_price when paid';
COMMENT ON COLUMN ticket_purchases.tshirt_picked_up IS 'v3: handed out at check-in';

-- Also ensure free-reg path can store amount on registration
-- (tshirt_amount_paid already exists from ADD_EVENT_TSHIRTS.sql)

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ticket_purchases'
  AND column_name LIKE 'tshirt_%'
ORDER BY column_name;
