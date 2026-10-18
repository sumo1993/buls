-- Embassy role + consular cases
-- Run in Supabase SQL Editor
-- Embassy fees are handled by Embassy staff only; BULS Treasurer is NOT involved.

-- 1) Role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'embassy';

-- 2) Cases
CREATE TABLE IF NOT EXISTS embassy_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (
    service_type IN (
      'passport_renewal',
      'passport_new',
      't_visa',
      'student_visa_cancellation',
      'document_request'
    )
  ),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'draft',
      'submitted',
      'under_review',
      'docs_requested',
      'awaiting_payment_proof',
      'in_progress',
      'ready',
      'completed',
      'rejected',
      'cancelled'
    )
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  member_notes TEXT,
  -- Internal notes: never return to member APIs
  embassy_internal_notes TEXT,
  payment_channel TEXT DEFAULT 'none' CHECK (
    payment_channel IS NULL OR payment_channel IN (
      'none',
      'embassy_direct',
      'liberia_lra',
      'overseas_official',
      'other'
    )
  ),
  lra_bill_number TEXT,
  payment_receipt_number TEXT,
  official_transaction_id TEXT,
  -- Embassy-only fee tracking (never treasurer)
  embassy_fee_status TEXT DEFAULT 'not_required' CHECK (
    embassy_fee_status IS NULL OR embassy_fee_status IN (
      'not_required',
      'unpaid',
      'proof_uploaded',
      'verified_by_embassy'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embassy_cases_user ON embassy_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_embassy_cases_status ON embassy_cases(status);
CREATE INDEX IF NOT EXISTS idx_embassy_cases_service ON embassy_cases(service_type);
CREATE INDEX IF NOT EXISTS idx_embassy_cases_assigned ON embassy_cases(assigned_to);

COMMENT ON TABLE embassy_cases IS 'Liberian Embassy Beijing consular requests. Payments verified by embassy staff only — not BULS treasurer.';
COMMENT ON COLUMN embassy_cases.embassy_internal_notes IS 'Staff-only notes; strip from member API responses';
COMMENT ON COLUMN embassy_cases.lra_bill_number IS 'Liberia LRA Bill No. (wall bill) when member pays in Liberia';

-- 3) Documents
CREATE TABLE IF NOT EXISTS embassy_case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES embassy_cases(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (
    doc_type IN (
      'passport_bio',
      'photo',
      'receipt',
      'university_letter',
      'residence_permit',
      'other'
    )
  ),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embassy_docs_case ON embassy_case_documents(case_id);

-- 4) Status history
CREATE TABLE IF NOT EXISTS embassy_case_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES embassy_cases(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embassy_history_case ON embassy_case_status_history(case_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_embassy_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_embassy_cases_updated_at ON embassy_cases;
CREATE TRIGGER trg_embassy_cases_updated_at
  BEFORE UPDATE ON embassy_cases
  FOR EACH ROW EXECUTE FUNCTION set_embassy_cases_updated_at();

-- Verify
SELECT 'embassy_cases' AS tbl, COUNT(*) AS cols
FROM information_schema.columns WHERE table_name = 'embassy_cases'
UNION ALL
SELECT 'embassy_case_documents', COUNT(*)
FROM information_schema.columns WHERE table_name = 'embassy_case_documents'
UNION ALL
SELECT 'embassy_case_status_history', COUNT(*)
FROM information_schema.columns WHERE table_name = 'embassy_case_status_history';
