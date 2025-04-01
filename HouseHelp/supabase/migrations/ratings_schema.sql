-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_worker_review boolean NOT NULL, -- true if worker is being reviewed, false if household is being reviewed
  status text CHECK (status IN ('pending', 'published', 'rejected', 'flagged')),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_id, reviewee_id)
);

-- Review responses table
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  responder_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(review_id)
);

-- Review reports table
CREATE TABLE IF NOT EXISTS review_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Reviews can be viewed by anyone
CREATE POLICY "Reviews are viewable by everyone" 
ON reviews FOR SELECT USING (status = 'published');

-- Reviews can only be created by the reviewer
CREATE POLICY "Reviews can only be created by the reviewer" 
ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Reviews can only be updated by the reviewer
CREATE POLICY "Reviews can only be updated by the reviewer" 
ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- Review responses can be viewed by anyone
CREATE POLICY "Review responses are viewable by everyone" 
ON review_responses FOR SELECT USING (true);

-- Review responses can only be created by the responder
CREATE POLICY "Review responses can only be created by the responder" 
ON review_responses FOR INSERT WITH CHECK (auth.uid() = responder_id);

-- Review responses can only be updated by the responder
CREATE POLICY "Review responses can only be updated by the responder" 
ON review_responses FOR UPDATE USING (auth.uid() = responder_id);

-- Function to get user rating
CREATE OR REPLACE FUNCTION get_user_rating(user_id_param uuid)
RETURNS TABLE (
  average_rating numeric,
  total_reviews integer
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as total_reviews
  FROM 
    reviews r
  WHERE 
    r.reviewee_id = user_id_param
    AND r.status = 'published';
END;
$$;

-- Function to check if user can review
CREATE OR REPLACE FUNCTION can_review_booking(
  booking_id_param uuid,
  reviewer_id_param uuid,
  reviewee_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  booking_exists boolean;
  review_exists boolean;
BEGIN
  -- Check if booking exists and is completed
  SELECT EXISTS (
    SELECT 1
    FROM bookings b
    WHERE 
      b.id = booking_id_param
      AND b.status = 'completed'
      AND (b.user_id = reviewer_id_param OR b.worker_id = reviewer_id_param)
      AND (b.user_id = reviewee_id_param OR b.worker_id = reviewee_id_param)
  ) INTO booking_exists;
  
  IF NOT booking_exists THEN
    RETURN false;
  END IF;
  
  -- Check if review already exists
  SELECT EXISTS (
    SELECT 1
    FROM reviews r
    WHERE 
      r.booking_id = booking_id_param
      AND r.reviewer_id = reviewer_id_param
      AND r.reviewee_id = reviewee_id_param
  ) INTO review_exists;
  
  RETURN NOT review_exists;
END;
$$;

