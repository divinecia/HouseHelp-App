-- Function to find workers within a certain distance
CREATE OR REPLACE FUNCTION find_workers_within_distance(
  lat double precision,
  lng double precision,
  distance_km double precision
)
RETURNS SETOF worker_profiles
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM worker_profiles
  WHERE ST_DWithin(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(worker_profiles.location->>'longitude', worker_profiles.location->>'latitude')::geography,
    distance_km * 1000  -- Convert km to meters
  );
$$;

