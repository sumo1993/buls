-- Add disbursement proof upload field to loans table
-- This allows treasurer to upload proof of disbursement (receipt, bank transfer screenshot, etc.)

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS disbursement_proof_url TEXT,
ADD COLUMN IF NOT EXISTS disbursement_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN loans.disbursement_proof_url IS 'URL to proof of disbursement (receipt, bank transfer screenshot, etc.)';
COMMENT ON COLUMN loans.disbursement_notes IS 'Additional notes from treasurer about the disbursement';

-- Create index for querying loans with proof
CREATE INDEX IF NOT EXISTS idx_loans_disbursement_proof ON loans(disbursement_proof_url) WHERE disbursement_proof_url IS NOT NULL;
