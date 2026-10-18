const bcrypt = require('bcryptjs');

// Generate a password hash
const password = 'Admin@123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // SQL to insert admin user
  console.log('\n--- SQL to insert admin user ---');
  console.log(`INSERT INTO users (email, full_name, password_hash, role, status, clerk_id)
VALUES ('admin@buls.org', 'Admin User', '${hash}', 'admin', 'active', 'admin-manual');`);
});
