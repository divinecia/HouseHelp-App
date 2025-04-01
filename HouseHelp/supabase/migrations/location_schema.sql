-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Update worker_profiles table to include location data
ALTER TABLE worker_profiles 
ADD COLUMN IF NOT EXISTS current_location geography(POINT);

-- Add index for faster geo queries
CREATE INDEX IF NOT EXISTS idx_worker_profiles_location 
ON worker_profiles USING GIST (current_location);

-- Function to find workers within a radius
CREATE OR REPLACE FUNCTION find_workers_within_radius(
  lat double precision,
  lng double precision,
  radius_meters double precision
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  profile_image text,
  services jsonb,
  experience_years integer,
  hourly_rate numeric,
  rating numeric,
  distance_meters double precision
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.id,
    wp.user_id,
    wp.full_name,
    wp.profile_image,
    wp.services,
    wp.experience_years,
    wp.hourly_rate,
    wp.rating,
    ST_Distance(
      wp.current_location, 
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters
  FROM 
    worker_profiles wp
  WHERE 
    ST_DWithin(
      wp.current_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY 
    distance_meters ASC;
END;
$$;

-- Function to update worker location
CREATE OR REPLACE FUNCTION update_worker_location(
  worker_id_param uuid,
  lat double precision,
  lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE worker_profiles
  SET 
    current_location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    updated_at = NOW()
  WHERE 
    id = worker_id_param;
END;
$$;

-- Create geofence zones table
CREATE TABLE IF NOT EXISTS geofence_zones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  boundary geography(POLYGON) NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Function to check if a point is within any geofence
CREATE OR REPLACE FUNCTION is_within_geofence(
  lat double precision,
  lng double precision
)
RETURNS TABLE (
  zone_id uuid,
  zone_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gz.id,
    gz.name
  FROM 
    geofence_zones gz
  WHERE 
    ST_Contains(
      gz.boundary,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    );
END;
$$;

