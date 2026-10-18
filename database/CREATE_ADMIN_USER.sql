-- Insert admin user for testing
-- Email: admin@buls.org
-- Password: Admin@123

INSERT INTO users (email, full_name, password_hash, role, status, clerk_id)
VALUES (
  'admin@buls.org',
  'Admin User',
  '$2b$10$mp55U2SGVKSP7HP9rtYg6.z59rW9/6zbWYLsZ.1bj0eqo.e2af4AC',
  'admin',
  'active',
  'admin-manual'
)
ON CONFLICT (email) DO NOTHING;
