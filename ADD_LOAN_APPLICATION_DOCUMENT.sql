-- Add document upload field to loans table

-- Add column for storing the application document URL
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS application_document_url TEXT,
ADD COLUMN IF NOT EXISTS application_document_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS application_document_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN loans.application_document_url IS 'URL/path to the uploaded written loan application document';
COMMENT ON COLUMN loans.application_document_name IS 'Original filename of the uploaded document';
COMMENT ON COLUMN loans.application_document_uploaded_at IS 'Timestamp when document was uploaded';

-- Create index for document tracking
CREATE INDEX IF NOT EXISTS idx_loans_with_documents ON loans(application_document_url) WHERE application_document_url IS NOT NULL;
