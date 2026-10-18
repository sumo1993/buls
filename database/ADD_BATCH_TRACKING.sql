-- Add batch tracking to payments table for multi-month payment grouping
-- This allows financial institutions to group related payments while maintaining individual records

-- Add batch_id to group related payments together
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Add batch_size to indicate how many payments are in the group
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 1;

-- Add batch_sequence to indicate position in the group (1 of 3, 2 of 3, etc.)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS batch_sequence INTEGER DEFAULT 1;

-- Add index for faster batch queries
CREATE INDEX IF NOT EXISTS idx_payments_batch_id ON payments(batch_id);

-- Add comment for documentation
COMMENT ON COLUMN payments.batch_id IS 'Groups related payments made in same transaction (e.g., 12-month bulk payment)';
COMMENT ON COLUMN payments.batch_size IS 'Total number of payments in this batch';
COMMENT ON COLUMN payments.batch_sequence IS 'Position of this payment in the batch (1-indexed)';

-- Example usage:
-- When treasurer records Oct, Nov, Dec together:
-- Payment 1: batch_id=uuid1, batch_size=3, batch_sequence=1, month=October
-- Payment 2: batch_id=uuid1, batch_size=3, batch_sequence=2, month=November  
-- Payment 3: batch_id=uuid1, batch_size=3, batch_sequence=3, month=December
