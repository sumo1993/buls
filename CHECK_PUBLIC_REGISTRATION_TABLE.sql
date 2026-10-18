-- Check if public_registrations table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'public_registrations'
);

-- If it exists, check its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'public_registrations'
ORDER BY ordinal_position;

-- Check if events table has the new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('allow_public_registration', 'require_guest_approval', 'payment_qr_code_url')
ORDER BY column_name;
