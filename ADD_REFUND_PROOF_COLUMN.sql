-- Add refund proof URL column to ticket_guests table
ALTER TABLE ticket_guests 
ADD COLUMN IF NOT EXISTS refund_proof_url TEXT;

COMMENT ON COLUMN ticket_guests.refund_proof_url IS 'URL to the refund receipt/proof image uploaded by treasurer';
