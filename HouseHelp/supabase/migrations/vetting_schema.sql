-- Verification types table
CREATE TABLE IF NOT EXISTS verification_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- User verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type_id uuid REFERENCES verification_types(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  verified_at timestamptz,
  expires_at timestamptz,
  verification_data jsonb,
  rejection_reason text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, verification_type_id)
);

-- Verification documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id uuid REFERENCES user_verifications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_url text NOT NULL,
  is_verified boolean DEFAULT false,
  verification_notes text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Background check requests table
CREATE TABLE IF NOT EXISTS background_check_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  provider text,
  provider_reference_id text,
  check_type text CHECK (check_type IN ('basic', 'standard', 'comprehensive')),
  result jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE verification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_check_requests ENABLE ROW LEVEL SECURITY;

-- Verification types can be viewed by anyone
CREATE POLICY "Verification types are viewable by everyone" 
ON verification_types FOR SELECT USING (is_active = true);

-- Users can only view their own verifications
CREATE POLICY "Users can only view their own verifications" 
ON user_verifications FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own verification documents
CREATE POLICY "Users can only view their own verification documents" 
ON verification_documents FOR SELECT USING (
  verification_id IN (
    SELECT id FROM user_verifications WHERE user_id = auth.uid()
  )
);

-- Users can only view their own background check requests
CREATE POLICY "Users can only view their own background check requests" 
ON background_check_requests FOR SELECT USING (auth.uid() = user_id);

-- Function to request verification
CREATE OR REPLACE FUNCTION request_verification(
  user_id_param uuid,
  verification_type_id_param uuid,
  verification_data_param jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  verification_id uuid;
BEGIN
  -- Check if verification already exists
  SELECT id INTO verification_id
  FROM user_verifications
  WHERE 
    user_id = user_id_param
    AND verification_type_id = verification_type_id_param
    AND status IN ('pending', 'approved');
  
  IF verification_id IS NOT NULL THEN
    RETURN verification_id;
  END IF;
  
  -- Create new verification request
  INSERT INTO user_verifications (
    user_id,
    verification_type_id,
    status,
    verification_data
  )
  VALUES (
    user_id_param,
    verification_type_id_param,
    'pending',
    verification_data_param
  )
  RETURNING id INTO verification_id;
  
  RETURN verification_id;
END;
$$;

-- Function to add verification document
CREATE OR REPLACE FUNCTION add_verification_document(
  verification_id_param uuid,
  document_type_param text,
  document_url_param text,
  verification_notes_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  document_id uuid;
  user_id_var uuid;
BEGIN
  -- Check if verification belongs to the user
  SELECT user_id INTO user_id_var
  FROM user_verifications
  WHERE id = verification_id_param;
  
  IF user_id_var != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Add document
  INSERT INTO verification_documents (
    verification_id,
    document_type,
    document_url,
    verification_notes
  )
  VALUES (
    verification_id_param,
    document_type_param,
    document_url_param,
    verification_notes_param
  )
  RETURNING id INTO document_id;
  
  RETURN document_id;
END;
$$;

-- Function to request background check
CREATE OR REPLACE FUNCTION request_background_check(
  user_id_param uuid,
  check_type_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id uuid;
BEGIN
  -- Create background check request
  INSERT INTO background_check_requests (
    user_id,
    status,
    check_type
  )
  VALUES (
    user_id_param,
    'pending',
    check_type_param
  )
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$;

