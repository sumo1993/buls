-- Add payment_source to distinguish between student uploads and treasurer recordings
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'student_upload';

-- Add check constraint to ensure valid values
ALTER TABLE payments 
ADD CONSTRAINT check_payment_source 
CHECK (payment_source IN ('student_upload', 'treasurer_upload', 'cash'));

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_payments_source ON payments(payment_source);

-- Comment explaining the field
COMMENT ON COLUMN payments.payment_source IS 
'How the payment was submitted: student_upload (digital), treasurer_upload (cash recorded by treasurer)';
