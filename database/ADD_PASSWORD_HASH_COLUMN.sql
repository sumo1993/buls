-- Add password_hash column to users table for NextAuth migration
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
