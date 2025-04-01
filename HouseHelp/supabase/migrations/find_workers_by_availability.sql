-- Function to find workers by availability
CREATE OR REPLACE FUNCTION find_workers_by_availability(
  day_of_week text,
  start_time text,
  end_time text
)
RETURNS SETOF worker_profiles
LANGUAGE sql
STABLE
AS $$
  SELECT wp.*
  FROM worker_profiles wp
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(wp.availability) as avail
    WHERE 
      avail->>'day' = day_of_week AND
      avail->>'startTime' <= start_time AND
      avail->>'endTime' >= end_time
  );
$$;

