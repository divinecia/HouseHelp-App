-- Create materialized views for analytics
-- Worker performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS worker_performance_metrics AS
SELECT
  w.id AS worker_id,
  w.full_name,
  COUNT(b.id) AS total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) AS completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) AS cancelled_bookings,
  COALESCE(AVG(r.rating), 0) AS average_rating,
  COUNT(r.id) AS total_ratings,
  SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600) AS total_hours_worked,
  SUM(b.total_amount) AS total_earnings,
  CASE 
    WHEN SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600) > 0 
    THEN SUM(b.total_amount) / SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600)
    ELSE 0
  END AS average_hourly_rate,
  COUNT(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN 1 END) AS bookings_last_30_days,
  SUM(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN b.total_amount ELSE 0 END) AS earnings_last_30_days
FROM
  worker_profiles w
  LEFT JOIN bookings b ON w.id = b.worker_id
  LEFT JOIN reviews r ON b.id = r.booking_id AND r.is_worker_review = true
GROUP BY
  w.id, w.full_name;

-- Household booking metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS household_booking_metrics AS
SELECT
  u.id AS user_id,
  p.full_name,
  COUNT(b.id) AS total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) AS completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) AS cancelled_bookings,
  SUM(b.total_amount) AS total_spent,
  AVG(b.total_amount) AS average_booking_amount,
  COUNT(DISTINCT b.worker_id) AS unique_workers_hired,
  MAX(b.created_at) AS last_booking_date,
  COUNT(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN 1 END) AS bookings_last_30_days,
  SUM(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN b.total_amount ELSE 0 END) AS spent_last_30_days,
  COALESCE(AVG(r.rating), 0) AS average_rating_given
FROM
  auth.users u
  JOIN profiles p ON u.id = p.id
  LEFT JOIN bookings b ON u.id = b.user_id
  LEFT JOIN reviews r ON b.id = r.booking_id AND r.is_worker_review = false
GROUP BY
  u.id, p.full_name;

-- Service popularity metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS service_popularity_metrics AS
SELECT
  s.service_type,
  COUNT(b.id) AS total_bookings,
  COUNT(DISTINCT b.user_id) AS unique_customers,
  COUNT(DISTINCT b.worker_id) AS unique_workers,
  SUM(b.total_amount) AS total_revenue,
  AVG(b.total_amount) AS average_booking_amount,
  COALESCE(AVG(r.rating), 0) AS average_rating,
  COUNT(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN 1 END) AS bookings_last_30_days,
  SUM(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN b.total_amount ELSE 0 END) AS revenue_last_30_days
FROM
  bookings b
  JOIN jsonb_array_elements_text(b.services) AS s(service_type) ON true
  LEFT JOIN reviews r ON b.id = r.booking_id AND r.is_worker_review = true
GROUP BY
  s.service_type;

-- Location-based booking metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS location_booking_metrics AS
SELECT
  b.location->>'district' AS district,
  b.location->>'city' AS city,
  COUNT(b.id) AS total_bookings,
  COUNT(DISTINCT b.user_id) AS unique_customers,
  COUNT(DISTINCT b.worker_id) AS unique_workers,
  SUM(b.total_amount) AS total_revenue,
  AVG(b.total_amount) AS average_booking_amount,
  COUNT(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN 1 END) AS bookings_last_30_days
FROM
  bookings b
WHERE
  b.location IS NOT NULL
GROUP BY
  b.location->>'district', b.location->>'city';

-- Time-based booking metrics (by hour of day and day of week)
CREATE MATERIALIZED VIEW IF NOT EXISTS time_booking_metrics AS
SELECT
  EXTRACT(DOW FROM b.start_time) AS day_of_week,
  EXTRACT(HOUR FROM b.start_time) AS hour_of_day,
  COUNT(b.id) AS total_bookings,
  AVG(b.total_amount) AS average_booking_amount,
  COUNT(CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN 1 END) AS bookings_last_30_days
FROM
  bookings b
GROUP BY
  EXTRACT(DOW FROM b.start_time), EXTRACT(HOUR FROM b.start_time);

-- Function to refresh all analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW worker_performance_metrics;
  REFRESH MATERIALIZED VIEW household_booking_metrics;
  REFRESH MATERIALIZED VIEW service_popularity_metrics;
  REFRESH MATERIALIZED VIEW location_booking_metrics;
  REFRESH MATERIALIZED VIEW time_booking_metrics;
END;
$$;

-- Function to get worker performance metrics
CREATE OR REPLACE FUNCTION get_worker_performance(
  worker_id_param uuid,
  start_date_param timestamptz DEFAULT NULL,
  end_date_param timestamptz DEFAULT NULL
)
RETURNS TABLE (
  metric_name text,
  metric_value numeric,
  comparison_value numeric,
  change_percentage numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  start_date timestamptz;
  end_date timestamptz;
  comparison_start_date timestamptz;
  comparison_end_date timestamptz;
BEGIN
  -- Set default date ranges if not provided
  start_date := COALESCE(start_date_param, NOW() - INTERVAL '30 days');
  end_date := COALESCE(end_date_param, NOW());
  
  -- Calculate comparison period (same length as the selected period, but earlier)
  comparison_start_date := start_date - (end_date - start_date);
  comparison_end_date := start_date;
  
  -- Total bookings
  RETURN QUERY
  SELECT 
    'Total Bookings' as metric_name,
    COUNT(b.id)::numeric as metric_value,
    (SELECT COUNT(id)::numeric FROM bookings 
     WHERE worker_id = worker_id_param 
     AND created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT COUNT(id) FROM bookings 
            WHERE worker_id = worker_id_param 
            AND created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (COUNT(b.id)::numeric / 
            (SELECT COUNT(id)::numeric FROM bookings 
             WHERE worker_id = worker_id_param 
             AND created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM bookings b
  WHERE b.worker_id = worker_id_param
  AND b.created_at BETWEEN start_date AND end_date;
  
  -- Total earnings
  RETURN QUERY
  SELECT 
    'Total Earnings' as metric_name,
    SUM(b.total_amount)::numeric as metric_value,
    (SELECT SUM(total_amount)::numeric FROM bookings 
     WHERE worker_id = worker_id_param 
     AND created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT SUM(total_amount) FROM bookings 
            WHERE worker_id = worker_id_param 
            AND created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (SUM(b.total_amount)::numeric / 
            (SELECT SUM(total_amount)::numeric FROM bookings 
             WHERE worker_id = worker_id_param 
             AND created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM bookings b
  WHERE b.worker_id = worker_id_param
  AND b.created_at BETWEEN start_date AND end_date;
  
  -- Average rating
  RETURN QUERY
  SELECT 
    'Average Rating' as metric_name,
    COALESCE(AVG(r.rating), 0)::numeric as metric_value,
    (SELECT COALESCE(AVG(rating), 0)::numeric FROM reviews r
     JOIN bookings b ON r.booking_id = b.id
     WHERE b.worker_id = worker_id_param 
     AND r.is_worker_review = true
     AND r.created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT AVG(rating) FROM reviews r
            JOIN bookings b ON r.booking_id = b.id
            WHERE b.worker_id = worker_id_param 
            AND r.is_worker_review = true
            AND r.created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (COALESCE(AVG(r.rating), 0)::numeric / 
            (SELECT COALESCE(AVG(rating), 0)::numeric FROM reviews r
             JOIN bookings b ON r.booking_id = b.id
             WHERE b.worker_id = worker_id_param 
             AND r.is_worker_review = true
             AND r.created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM reviews r
  JOIN bookings b ON r.booking_id = b.id
  WHERE b.worker_id = worker_id_param
  AND r.is_worker_review = true
  AND r.created_at BETWEEN start_date AND end_date;
  
  -- Hours worked
  RETURN QUERY
  SELECT 
    'Hours Worked' as metric_name,
    SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600)::numeric as metric_value,
    (SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::numeric FROM bookings 
     WHERE worker_id = worker_id_param 
     AND created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) FROM bookings 
            WHERE worker_id = worker_id_param 
            AND created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600)::numeric / 
            (SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::numeric FROM bookings 
             WHERE worker_id = worker_id_param 
             AND created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM bookings b
  WHERE b.worker_id = worker_id_param
  AND b.created_at BETWEEN start_date AND end_date;
END;
$$;

-- Function to get household booking metrics
CREATE OR REPLACE FUNCTION get_household_metrics(
  user_id_param uuid,
  start_date_param timestamptz DEFAULT NULL,
  end_date_param timestamptz DEFAULT NULL
)
RETURNS TABLE (
  metric_name text,
  metric_value numeric,
  comparison_value numeric,
  change_percentage numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  start_date timestamptz;
  end_date timestamptz;
  comparison_start_date timestamptz;
  comparison_end_date timestamptz;
BEGIN
  -- Set default date ranges if not provided
  start_date := COALESCE(start_date_param, NOW() - INTERVAL '30 days');
  end_date := COALESCE(end_date_param, NOW());
  
  -- Calculate comparison period (same length as the selected period, but earlier)
  comparison_start_date := start_date - (end_date - start_date);
  comparison_end_date := start_date;
  
  -- Total bookings
  RETURN QUERY
  SELECT 
    'Total Bookings' as metric_name,
    COUNT(b.id)::numeric as metric_value,
    (SELECT COUNT(id)::numeric FROM bookings 
     WHERE user_id = user_id_param 
     AND created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT COUNT(id) FROM bookings 
            WHERE user_id = user_id_param 
            AND created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (COUNT(b.id)::numeric / 
            (SELECT COUNT(id)::numeric FROM bookings 
             WHERE user_id = user_id_param 
             AND created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM bookings b
  WHERE b.user_id = user_id_param
  AND b.created_at BETWEEN start_date AND end_date;
  
  -- Total spent
  RETURN QUERY
  SELECT 
    'Total Spent' as metric_name,
    SUM(b.total_amount)::numeric as metric_value,
    (SELECT SUM(total_amount  as metric_name,
    SUM(b.total_amount)::numeric as metric_value,
    (SELECT SUM(total_amount)::numeric FROM bookings 
     WHERE user_id = user_id_param 
     AND created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT SUM(total_amount) FROM bookings 
            WHERE user_id = user_id_param 
            AND created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (SUM(b.total_amount)::numeric / 
            (SELECT SUM(total_amount)::numeric FROM bookings 
             WHERE user_id = user_id_param 
             AND created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM bookings b
  WHERE b.user_id = user_id_param
  AND b.created_at BETWEEN start_date AND end_date;
  
  -- Average booking amount
  RETURN QUERY
  SELECT 
    'Average Booking Amount' as metric_name,
    AVG(b.total_amount)::numeric as metric_value,
    (SELECT AVG(total_amount)::numeric FROM bookings 
     WHERE user_id = user_id_param 
     AND created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT AVG(total_amount) FROM bookings 
            WHERE user_id = user_id_param 
            AND created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (AVG(b.total_amount)::numeric / 
            (SELECT AVG(total_amount)::numeric FROM bookings 
             WHERE user_id = user_id_param 
             AND created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM bookings b
  WHERE b.user_id = user_id_param
  AND b.created_at BETWEEN start_date AND end_date;
  
  -- Unique workers hired
  RETURN QUERY
  SELECT 
    'Unique Workers Hired' as metric_name,
    COUNT(DISTINCT b.worker_id)::numeric as metric_value,
    (SELECT COUNT(DISTINCT worker_id)::numeric FROM bookings 
     WHERE user_id = user_id_param 
     AND created_at BETWEEN comparison_start_date AND comparison_end_date) as comparison_value,
    CASE 
      WHEN (SELECT COUNT(DISTINCT worker_id) FROM bookings 
            WHERE user_id = user_id_param 
            AND created_at BETWEEN comparison_start_date AND comparison_end_date) = 0 THEN NULL
      ELSE (COUNT(DISTINCT b.worker_id)::numeric / 
            (SELECT COUNT(DISTINCT worker_id)::numeric FROM bookings 
             WHERE user_id = user_id_param 
             AND created_at BETWEEN comparison_start_date AND comparison_end_date) - 1) * 100
    END as change_percentage
  FROM bookings b
  WHERE b.user_id = user_id_param
  AND b.created_at BETWEEN start_date AND end_date;
END;
$$;

-- Function to get service popularity metrics
CREATE OR REPLACE FUNCTION get_service_metrics(
  service_type_param text DEFAULT NULL,
  start_date_param timestamptz DEFAULT NULL,
  end_date_param timestamptz DEFAULT NULL
)
RETURNS TABLE (
  service_type text,
  total_bookings bigint,
  total_revenue numeric,
  average_booking_amount numeric,
  unique_customers bigint,
  unique_workers bigint,
  average_rating numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  start_date timestamptz;
  end_date timestamptz;
BEGIN
  -- Set default date ranges if not provided
  start_date := COALESCE(start_date_param, NOW() - INTERVAL '30 days');
  end_date := COALESCE(end_date_param, NOW());
  
  RETURN QUERY
  SELECT
    s.service_type,
    COUNT(b.id) AS total_bookings,
    SUM(b.total_amount)::numeric AS total_revenue,
    AVG(b.total_amount)::numeric AS average_booking_amount,
    COUNT(DISTINCT b.user_id) AS unique_customers,
    COUNT(DISTINCT b.worker_id) AS unique_workers,
    COALESCE(AVG(r.rating), 0)::numeric AS average_rating
  FROM
    bookings b
    JOIN jsonb_array_elements_text(b.services) AS s(service_type) ON true
    LEFT JOIN reviews r ON b.id = r.booking_id AND r.is_worker_review = true
  WHERE
    b.created_at BETWEEN start_date AND end_date
    AND (service_type_param IS NULL OR s.service_type = service_type_param)
  GROUP BY
    s.service_type
  ORDER BY
    COUNT(b.id) DESC;
END;
$$;

