#!/usr/bin/env node

/**
 * Pre-flight check for announcement system
 * Run this before testing to verify everything is configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Announcement System Setup...\n');

let allPassed = true;
const checks = [];

// Check 1: Environment variables
console.log('1️⃣  Checking environment variables...');
try {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    checks.push({ name: 'Environment File', status: '❌', message: '.env.local not found' });
    allPassed = false;
  } else {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY'
    ];
    
    const missingVars = requiredVars.filter(v => !envContent.includes(v));
    
    if (missingVars.length > 0) {
      checks.push({ 
        name: 'Environment Variables', 
        status: '❌', 
        message: `Missing: ${missingVars.join(', ')}` 
      });
      allPassed = false;
    } else {
      checks.push({ name: 'Environment Variables', status: '✅', message: 'All required vars present' });
    }
  }
} catch (error) {
  checks.push({ name: 'Environment Check', status: '❌', message: error.message });
  allPassed = false;
}

// Check 2: API Route exists
console.log('2️⃣  Checking API routes...');
const apiPath = path.join(__dirname, 'app', 'api', 'announcements', 'route.ts');
if (fs.existsSync(apiPath)) {
  checks.push({ name: 'API Route', status: '✅', message: '/api/announcements exists' });
} else {
  checks.push({ name: 'API Route', status: '❌', message: 'route.ts not found' });
  allPassed = false;
}

// Check 3: Admin page exists
console.log('3️⃣  Checking admin pages...');
const adminPath = path.join(__dirname, 'app', 'admin', 'announcements', 'page.tsx');
if (fs.existsSync(adminPath)) {
  checks.push({ name: 'Admin Page', status: '✅', message: '/admin/announcements exists' });
} else {
  checks.push({ name: 'Admin Page', status: '❌', message: 'page.tsx not found' });
  allPassed = false;
}

// Check 4: Test tool exists
console.log('4️⃣  Checking test tools...');
const testToolPath = path.join(__dirname, 'public', 'test-announcement.html');
if (fs.existsSync(testToolPath)) {
  checks.push({ name: 'Test Tool', status: '✅', message: '/test-announcement.html exists' });
} else {
  checks.push({ name: 'Test Tool', status: '❌', message: 'test-announcement.html not found' });
  allPassed = false;
}

// Check 5: Debug API exists
console.log('5️⃣  Checking debug endpoints...');
const debugApiPath = path.join(__dirname, 'app', 'api', 'test-announcement', 'route.ts');
if (fs.existsSync(debugApiPath)) {
  checks.push({ name: 'Debug API', status: '✅', message: '/api/test-announcement exists' });
} else {
  checks.push({ name: 'Debug API', status: '❌', message: 'Debug API not found' });
  allPassed = false;
}

// Check 6: SQL migration exists
console.log('6️⃣  Checking SQL scripts...');
const sqlPath = path.join(__dirname, 'verify-announcements-table.sql');
if (fs.existsSync(sqlPath)) {
  checks.push({ name: 'SQL Script', status: '✅', message: 'verify-announcements-table.sql exists' });
} else {
  checks.push({ name: 'SQL Script', status: '⚠️', message: 'SQL verification script not found (optional)' });
}

// Check 7: Dependencies
console.log('7️⃣  Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = ['next', 'react', '@clerk/nextjs', '@supabase/supabase-js'];
  const missingDeps = requiredDeps.filter(d => 
    !packageJson.dependencies?.[d] && !packageJson.devDependencies?.[d]
  );
  
  if (missingDeps.length > 0) {
    checks.push({ 
      name: 'Dependencies', 
      status: '❌', 
      message: `Missing: ${missingDeps.join(', ')}` 
    });
    allPassed = false;
  } else {
    checks.push({ name: 'Dependencies', status: '✅', message: 'All required packages installed' });
  }
}

// Display results
console.log('\n' + '='.repeat(60));
console.log('📊 Setup Check Results');
console.log('='.repeat(60) + '\n');

checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(30)} ${check.message}`);
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('✅ All checks passed! You\'re ready to test.\n');
  console.log('Next steps:');
  console.log('1. Make sure your dev server is running: npm run dev');
  console.log('2. Open http://localhost:3000/test-announcement.html');
  console.log('3. Click "Check My Status" to verify authentication\n');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.\n');
  console.log('Common fixes:');
  console.log('- Run: npm install');
  console.log('- Check your .env.local file');
  console.log('- Make sure all files were created correctly\n');
}

// Additional recommendations
console.log('📋 Before testing, make sure:');
console.log('   [ ] Dev server is running (npm run dev)');
console.log('   [ ] You\'re logged in to the app');
console.log('   [ ] Your user role is admin or secretary');
console.log('   [ ] Announcements table exists in Supabase');
console.log('');

// Check if server is running
const http = require('http');
console.log('🔌 Checking if dev server is running...');
const req = http.get('http://localhost:3000', (res) => {
  console.log('✅ Dev server is running on port 3000\n');
  console.log('🚀 Ready to test! Open: http://localhost:3000/test-announcement.html\n');
}).on('error', (err) => {
  console.log('❌ Dev server is not running');
  console.log('   Run: npm run dev\n');
});

// Timeout the server check
setTimeout(() => {
  req.destroy();
}, 2000);
