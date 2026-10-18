-- Budget Proposals Migration
-- Creates tables for committee budget proposals with multi-level approval workflow

-- Add finance role to user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'finance' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'finance';
    END IF;
END $$;

-- Budget Proposals Table
CREATE TABLE IF NOT EXISTS budget_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID REFERENCES committees(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'paid')),
  total_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- Approval workflow timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  secretary_reviewed_at TIMESTAMP WITH TIME ZONE,
  secretary_approved_at TIMESTAMP WITH TIME ZONE,
  treasurer_processed_at TIMESTAMP WITH TIME ZONE,
  treasurer_approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes for rejection or review
  review_notes TEXT,
  payment_reference TEXT
);

-- Budget Proposal Items Table (line items)
CREATE TABLE IF NOT EXISTS budget_proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES budget_proposals(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Records Table
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES budget_proposals(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_reference TEXT,
  paid_to_committee_id UUID REFERENCES committees(id) ON DELETE SET NULL,
  paid_to_name VARCHAR(255),
  paid_to_account TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE budget_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_proposals
CREATE POLICY "Committee members can read their own proposals"
  ON budget_proposals FOR SELECT
  USING (
    committee_id IN (
      SELECT cm.committee_id FROM committee_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Secretary can read all proposals"
  ON budget_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'secretary'
    )
  );

CREATE POLICY "Treasurer can read all proposals"
  ON budget_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'treasurer'
    )
  );

CREATE POLICY "Finance can read all proposals"
  ON budget_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'finance'
    )
  );

CREATE POLICY "Committee members can create proposals"
  ON budget_proposals FOR INSERT
  WITH CHECK (
    committee_id IN (
      SELECT cm.committee_id FROM committee_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.clerk_id = auth.uid()::text
    )
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.status = 'active'
    )
  );

CREATE POLICY "Committee members can update their own draft proposals"
  ON budget_proposals FOR UPDATE
  USING (
    committee_id IN (
      SELECT cm.committee_id FROM committee_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.clerk_id = auth.uid()::text
    )
    AND status = 'draft'
  );

CREATE POLICY "Secretary can update proposal status"
  ON budget_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'secretary'
    )
  );

CREATE POLICY "Treasurer can update proposal status"
  ON budget_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'treasurer'
    )
  );

-- RLS Policies for budget_proposal_items
CREATE POLICY "Committee members can read items of their proposals"
  ON budget_proposal_items FOR SELECT
  USING (
    proposal_id IN (
      SELECT bp.id FROM budget_proposals bp
      WHERE bp.committee_id IN (
        SELECT cm.committee_id FROM committee_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE u.clerk_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Committee members can manage items of their draft proposals"
  ON budget_proposal_items FOR ALL
  USING (
    proposal_id IN (
      SELECT bp.id FROM budget_proposals bp
      WHERE bp.committee_id IN (
        SELECT cm.committee_id FROM committee_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE u.clerk_id = auth.uid()::text
      )
      AND bp.status = 'draft'
    )
  );

-- RLS Policies for payment_records
CREATE POLICY "Secretaries and Treasurers can read all payment records"
  ON payment_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role IN ('secretary', 'treasurer', 'finance')
    )
  );

CREATE POLICY "Treasurer can create payment records"
  ON payment_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'treasurer'
    )
  );

CREATE POLICY "Finance can read payment records"
  ON payment_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_id = auth.uid()::text
      AND u.role = 'finance'
    )
  );
