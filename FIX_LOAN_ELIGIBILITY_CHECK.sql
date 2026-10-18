-- Fix has_unpaid_months function to accept both 'collected' and 'approved' payments
-- This fixes the issue where members with collected payments couldn't request loans

CREATE OR REPLACE FUNCTION has_unpaid_months(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_year INTEGER;
  current_month INTEGER;
  unpaid_count INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());
  current_month := EXTRACT(MONTH FROM NOW());
  
  -- Count unpaid months up to current month
  SELECT COUNT(*)
  INTO unpaid_count
  FROM generate_series(1, current_month) AS month_num
  WHERE NOT EXISTS (
    SELECT 1 FROM payments
    WHERE user_id = p_user_id
    AND year = current_year
    AND month = (
      CASE month_num
        WHEN 1 THEN 'January'
        WHEN 2 THEN 'February'
        WHEN 3 THEN 'March'
        WHEN 4 THEN 'April'
        WHEN 5 THEN 'May'
        WHEN 6 THEN 'June'
        WHEN 7 THEN 'July'
        WHEN 8 THEN 'August'
        WHEN 9 THEN 'September'
        WHEN 10 THEN 'October'
        WHEN 11 THEN 'November'
        WHEN 12 THEN 'December'
      END
    )
    AND status IN ('approved', 'collected')  -- Accept both collected and approved payments
  );
  
  RETURN unpaid_count > 0;
END;
$$ LANGUAGE plpgsql;
