-- Quick check if public_registrations table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'public_registrations'
) as table_exists;
