// Check what role the current user has
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkUsers() {
  console.log('👥 Checking all users and their roles:')
  console.log('='.repeat(50))
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, clerk_id, full_name, email, role')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }
  
  console.log(`Found ${users.length} users:\n`)
  
  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.full_name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Clerk ID: ${user.clerk_id}`)
    console.log('')
  })
  
  const admins = users.filter(u => ['admin', 'secretary', 'treasurer'].includes(u.role))
  console.log(`\n✅ ${admins.length} users with admin/secretary/treasurer role`)
  
  if (admins.length === 0) {
    console.log('⚠️ NO ADMIN USERS! This is why you get "Insufficient permissions"')
    console.log('💡 Solution: Update a user\'s role to "treasurer" in the database')
  }
}

checkUsers()