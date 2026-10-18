import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Enhanced guest system migration SQL
const MIGRATION_SQL = `
-- Step 1: Check current table structures
-- Enhanced ticket_guests table for real-world scenarios
ALTER TABLE ticket_guests 
ADD COLUMN IF NOT EXISTS relationship TEXT,
ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS added_by_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS added_at_event BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_applicable',
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add check constraint for payment_status
ALTER TABLE ticket_guests 
DROP CONSTRAINT IF EXISTS ticket_guests_payment_status_check;

ALTER TABLE ticket_guests 
ADD CONSTRAINT ticket_guests_payment_status_check 
CHECK (payment_status IN ('not_applicable', 'paid_online', 'paid_at_door', 'complimentary', 'pending'));

-- Step 2: Add event configuration for guest policies
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS allow_guest_addition_after_purchase BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_door_guest_addition BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS door_guest_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_total_guests_per_member INTEGER DEFAULT 4;

-- Step 3: Create event_attendees table for free events (simple tracking)
CREATE TABLE IF NOT EXISTS event_attendees (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  checked_in_by BIGINT REFERENCES users(id),
  is_walk_in BOOLEAN DEFAULT false,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_checked_in ON event_attendees(checked_in);

-- Step 5: Add RLS policies for event_attendees
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Users can view their own attendees
CREATE POLICY "Users can view own attendees"
ON event_attendees FOR SELECT
USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can add attendees for free events
CREATE POLICY "Users can add attendees to free events"
ON event_attendees FOR INSERT
WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Admins can manage all attendees
CREATE POLICY "Admins can manage all attendees"
ON event_attendees FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE clerk_id = auth.uid()::text 
    AND role IN ('admin', 'secretary', 'treasurer')
  )
);

-- Step 6: Verification
SELECT 'Enhanced guest system migration completed!' as result;
`

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check if user is admin
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    console.log('Running enhanced guest system migration...')

    // Execute SQL statements one by one
    const statements = MIGRATION_SQL.split(';').filter(stmt => stmt.trim().length > 0)
    const results: string[] = []

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim() + ';'
      
      // Skip empty statements
      if (stmt === ';') continue

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}`)
        
        // Use raw query method via admin client
        const { error } = await adminClient.rpc('exec_sql', { query: stmt })
        
        if (error) {
          // If exec_sql doesn't exist, try direct execution via query
          console.log('exec_sql not available, trying alternative approach...')
          
          // For table creation/alteration, we can use the admin client directly
          // but we need to handle each statement type differently
          if (stmt.toUpperCase().startsWith('ALTER TABLE')) {
            // This is complex - let's mark as manual migration required
            results.push(`Statement ${i + 1}: ALTER TABLE - requires manual execution`)
          } else if (stmt.toUpperCase().startsWith('CREATE TABLE')) {
            results.push(`Statement ${i + 1}: CREATE TABLE - requires manual execution`)
          } else if (stmt.toUpperCase().startsWith('CREATE INDEX')) {
            results.push(`Statement ${i + 1}: CREATE INDEX - requires manual execution`)
          } else if (stmt.toUpperCase().startsWith('CREATE POLICY')) {
            results.push(`Statement ${i + 1}: CREATE POLICY - requires manual execution`)
          } else {
            results.push(`Statement ${i + 1}: ${error.message}`)
          }
        } else {
          results.push(`Statement ${i + 1}: Success`)
        }
      } catch (error: any) {
        results.push(`Statement ${i + 1}: ${error.message}`)
      }
    }

    console.log('Migration execution results:', results)

    return NextResponse.json({ 
      message: 'Migration execution attempted',
      results,
      notes: 'Some SQL statements may need to be run manually in Supabase SQL editor',
      manualSteps: [
        '1. Copy the SQL from ENHANCED_GUEST_SYSTEM.sql',
        '2. Go to Supabase SQL Editor (https://app.supabase.com/project/jsvjdrnhvxlxzqhkijpj/sql)',
        '3. Paste and run the SQL',
        '4. Verify tables were created/altered'
      ]
    })

  } catch (error: any) {
    console.error('Error running migration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}