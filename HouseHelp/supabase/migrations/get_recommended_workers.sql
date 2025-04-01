-- Function to get recommended workers based on user preferences and ratings
CREATE OR REPLACE FUNCTION get_recommended_workers(
  user_id text,
  limit_count integer DEFAULT 5
)
RETURNS SETOF worker_profiles
LANGUAGE sql
STABLE
AS $$
  WITH user_preferences AS (
    -- Get user's previous bookings to determine preferences
    SELECT 
      b.worker_id,
      COUNT(*) as booking_count
    FROM bookings b
    WHERE b.user_id = user_id
    GROUP BY b.worker_id
  ),
  user_service_preferences AS (
    -- Get services the user has booked before
    SELECT 
      DISTINCT jsonb_array_elements_text(wp.services) as service
    FROM bookings b
    JOIN worker_profiles wp ON b.worker_id = wp.id
    WHERE b.user_id = user_id
  )
  
  SELECT wp.*
  FROM worker_profiles wp
  LEFT JOIN user_preferences up ON wp.id = up.worker_id
  WHERE 
    -- Include workers with high ratings
    wp.rating >= 4.0
    -- And either previously booked by the user or offering services the user has used
    OR EXISTS (
      SELECT 1 FROM user_preferences WHERE worker_id = wp.id
    )
    OR EXISTS (
      SELECT 1 
      FROM user_service_preferences usp
      WHERE usp.service = ANY(wp.services)
    )
  ORDER BY 
    -- Order by a combination of rating and previous booking count
    wp.rating DESC,
    COALESCE(up.booking_count, 0) DESC
  LIMIT limit_count;
$$;

