-- Benefit types table
CREATE TABLE IF NOT EXISTS benefit_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  provider text,
  provider_website text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Worker benefits table
CREATE TABLE IF NOT EXISTS worker_benefits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  benefit_type_id uuid REFERENCES benefit_types(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  start_date timestamptz,
  end_date timestamptz,
  policy_number text,
  coverage_details jsonb,
  monthly_premium numeric,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(worker_id, benefit_type_id)
);

-- Benefit claims table
CREATE TABLE IF NOT EXISTS benefit_claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_benefit_id uuid REFERENCES worker_benefits(id) ON DELETE CASCADE,
  claim_date timestamptz NOT NULL,
  claim_amount numeric NOT NULL,
  description text,
  status text CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'paid')),
  reference_number text,
  rejection_reason text,
  payment_date timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Benefit claim documents table
CREATE TABLE IF NOT EXISTS benefit_claim_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id uuid REFERENCES benefit_claims(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  document_type text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Worker welfare programs table
CREATE TABLE IF NOT EXISTS welfare_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  eligibility_criteria text,
  benefits text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Worker welfare enrollments table
CREATE TABLE IF NOT EXISTS welfare_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES welfare_programs(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive')),
  enrollment_date timestamptz,
  expiry_date timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(worker_id, program_id)
);

-- Create RLS policies
ALTER TABLE benefit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE welfare_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE welfare_enrollments ENABLE ROW LEVEL SECURITY;

-- Benefit types can be viewed by anyone
CREATE POLICY "Benefit types are viewable by everyone" 
ON benefit_types FOR SELECT USING (is_active = true);

-- Workers can only view their own benefits
CREATE POLICY "Workers can only view their own benefits" 
ON worker_benefits FOR SELECT USING (auth.uid() = worker_id);

-- Workers can only view their own benefit claims
CREATE POLICY "Workers can only view their own benefit claims" 
ON benefit_claims FOR SELECT USING (
  worker_benefit_id IN (
    SELECT id FROM worker_benefits WHERE worker_id = auth.uid()
  )
);

-- Workers can only view documents for their own claims
CREATE POLICY "Workers can only view documents for their own claims" 
ON benefit_claim_documents FOR SELECT USING (
  claim_id IN (
    SELECT bc.id FROM benefit_claims bc
    JOIN worker_benefits wb ON bc.worker_benefit_id = wb.id
    WHERE wb.worker_id = auth.uid()
  )
);

-- Welfare programs can be viewed by anyone
CREATE POLICY "Welfare programs are viewable by everyone" 
ON welfare_programs FOR SELECT USING (is_active = true);

-- Workers can only view their own welfare enrollments
CREATE POLICY "Workers can only view their own welfare enrollments" 
ON welfare_enrollments FOR SELECT USING (auth.uid() = worker_id);

-- Function to enroll worker in benefit
CREATE OR REPLACE FUNCTION enroll_worker_benefit(
  worker_id_param uuid,
  benefit_type_id_param uuid,
  start_date_param timestamptz DEFAULT NOW(),
  end_date_param timestamptz DEFAULT NULL,
  monthly_premium_param numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  benefit_id uuid;
BEGIN
  -- Check if worker is already enrolled
  SELECT id INTO benefit_id
  FROM worker_benefits
  WHERE 
    worker_id = worker_id_param
    AND benefit_type_id = benefit_type_id_param
    AND status IN ('pending', 'active');
  
  IF benefit_id IS NOT NULL THEN
    RETURN benefit_id;
  END IF;
  
  -- Create new enrollment
  INSERT INTO worker_benefits (
    worker_id,
    benefit_type_id,
    status,
    start_date,
    end_date,
    monthly_premium
  )
  VALUES (
    worker_id_param,
    benefit_type_id_param,
    'pending',
    start_date_param,
    end_date_param,
    monthly_premium_param
  )
  RETURNING id INTO benefit_id;
  
  RETURN benefit_id;
END;
$$;

-- Function to submit benefit claim
CREATE OR REPLACE FUNCTION submit_benefit_claim(
  worker_benefit_id_param uuid,
  claim_amount_param numeric,
  description_param text,
  claim_date_param timestamptz DEFAULT NOW()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_id uuid;
  worker_id_var uuid;
BEGIN
  -- Check if benefit belongs to the worker
  SELECT worker_id INTO worker_id_var
  FROM worker_benefits
  WHERE id = worker_benefit_id_param;
  
  IF worker_id_var != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Create claim
  INSERT INTO benefit_claims (
    worker_benefit_id,
    claim_date,
    claim_amount,
    description,
    status
  )
  VALUES (
    worker_benefit_id_param,
    claim_date_param,
    claim_amount_param,
    description_param,
    'submitted'
  )
  RETURNING id INTO claim_id;
  
  RETURN claim_id;
END;
$$;

-- Function to enroll worker in welfare program
CREATE OR REPLACE FUNCTION enroll_welfare_program(
  worker_id_param uuid,
  program_id_param uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enrollment_id uuid;
BEGIN
  -- Check if worker is already enrolled
  SELECT id INTO enrollment_id
  FROM welfare_enrollments
  WHERE 
    worker_id = worker_id_param
    AND program_id = program_id_param
    AND status IN ('pending', 'approved', 'active');
  
  IF enrollment_id IS NOT NULL THEN
    RETURN enrollment_id;
  END IF;
  
  -- Create new enrollment
  INSERT INTO welfare_enrollments (
    worker_id,
    program_id,
    status,
    enrollment_date
  )
  VALUES (
    worker_id_param,
    program_id_param,
    'pending',
    NOW()
  )
  RETURNING id INTO enrollment_id;
  
  RETURN enrollment_id;
END;
$$;

