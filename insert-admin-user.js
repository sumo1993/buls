const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  const password = 'Admin@123';
  const saltRounds = 10;
  
  try {
    // Hash the password
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('Creating admin user...');
    
    // Insert admin user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: 'admin@buls.org',
        full_name: 'Admin User',
        password_hash: hash,
        role: 'admin',
        status: 'active',
        clerk_id: 'admin-manual'
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        console.log('Admin user already exists');
      } else {
        console.error('Error creating admin user:', error);
      }
    } else {
      console.log('Admin user created successfully!');
      console.log('Email: admin@buls.org');
      console.log('Password: Admin@123');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createAdminUser();
