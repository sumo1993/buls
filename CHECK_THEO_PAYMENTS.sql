SELECT 
    id,
    user_id,
    amount,
    status,
    payment_method,
    payment_source,
    created_at,
    updated_at,
    collected_by,
    proof_url
FROM payments
WHERE user_id = (SELECT id FROM users WHERE full_name LIKE '%THEO%')
LIMIT 3;
