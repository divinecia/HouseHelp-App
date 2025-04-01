-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text REFERENCES referral_codes(code) ON DELETE SET NULL,
  status text CHECK (status IN ('pending', 'completed', 'expired')),
  completed_at timestamptz,
  reward_amount numeric,
  reward_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Loyalty points table
CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  tier text CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Loyalty point transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  transaction_type text CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'adjust')),
  source text NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz DEFAULT NOW()
);

-- Loyalty rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  points_required integer NOT NULL,
  reward_type text CHECK (reward_type IN ('discount', 'free_service', 'credit', 'gift')),
  reward_value jsonb,
  is_active boolean DEFAULT true,
  min_tier text CHECK (min_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Redeemed rewards table
CREATE TABLE IF NOT EXISTS redeemed_rewards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  points_used integer NOT NULL,
  status text CHECK (status IN ('pending', 'active', 'used', 'expired', 'cancelled')),
  code text,
  expires_at timestamptz,
  used_at timestamptz,
  booking_id uuid,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeemed_rewards ENABLE ROW LEVEL SECURITY;

-- Users can only view their own referral codes
CREATE POLICY "Users can only view their own referral codes" 
ON referral_codes FOR SELECT USING (auth.uid() = user_id);

-- Users can only view referrals where they are the referrer
CREATE POLICY "Users can only view referrals where they are the referrer" 
ON referrals FOR SELECT USING (auth.uid() = referrer_id);

-- Users can only view their own loyalty points
CREATE POLICY "Users can only view their own loyalty points" 
ON loyalty_points FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own loyalty transactions
CREATE POLICY "Users can only view their own loyalty transactions" 
ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);

-- Loyalty rewards can be viewed by anyone
CREATE POLICY "Loyalty rewards are viewable by everyone" 
ON loyalty_rewards FOR SELECT USING (is_active = true);

-- Users can only view their own redeemed rewards
CREATE POLICY "Users can only view their own redeemed rewards" 
ON redeemed_rewards FOR SELECT USING (auth.uid() = user_id);

-- Function to generate a referral code
CREATE OR REPLACE FUNCTION generate_referral_code(
  user_id_param uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Check if user already has a referral code
  SELECT EXISTS (
    SELECT 1 FROM referral_codes WHERE user_id = user_id_param
  ) INTO code_exists;
  
  IF code_exists THEN
    SELECT code INTO new_code FROM referral_codes WHERE user_id = user_id_param;
    RETURN new_code;
  END IF;
  
  -- Generate a unique code
  LOOP
    -- Generate a random 8-character alphanumeric code
    SELECT UPPER(SUBSTRING(MD5(RANDOM()::text) FOR 8)) INTO new_code;
    
    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM referral_codes WHERE code = new_code
    ) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert new referral code
  INSERT INTO referral_codes (
    user_id,
    code
  )
  VALUES (
    user_id_param,
    new_code
  );
  
  RETURN new_code;
END;
$$;

-- Function to apply a referral
CREATE OR REPLACE FUNCTION apply_referral(
  referred_id_param uuid,
  referral_code_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id_var uuid;
  referral_exists boolean;
BEGIN
  -- Check if user has already been referred
  SELECT EXISTS (
    SELECT 1 FROM referrals WHERE referred_id = referred_id_param
  ) INTO referral_exists;
  
  IF referral_exists THEN
    RETURN false;
  END IF;
  
  -- Get referrer ID from code
  SELECT user_id INTO referrer_id_var
  FROM referral_codes
  WHERE code = referral_code_param
  AND is_active = true;
  
  IF referrer_id_var IS NULL THEN
    RETURN false;
  END IF;
  
  -- Prevent self-referral
  IF referrer_id_var = referred_id_param THEN
    RETURN false;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (
    referrer_id,
    referred_id,
    referral_code,
    status
  )
  VALUES (
    referrer_id_var,
    referred_id_param,
    referral_code_param,
    'pending'
  );
  
  RETURN true;
END;
$$;

-- Function to complete a referral and award points
CREATE OR REPLACE FUNCTION complete_referral(
  referred_id_param uuid,
  reward_amount_param numeric DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referral_id_var uuid;
  referrer_id_var uuid;
  referrer_points_id uuid;
  referred_points_id uuid;
BEGIN
  -- Get referral record
  SELECT id, referrer_id INTO referral_id_var, referrer_id_var
  FROM referrals
  WHERE referred_id = referred_id_param
  AND status = 'pending';
  
  IF referral_id_var IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update referral status
  UPDATE referrals
  SET 
    status = 'completed',
    completed_at = NOW(),
    reward_amount = reward_amount_param
  WHERE id = referral_id_var;
  
  -- Award points to referrer
  SELECT id INTO referrer_points_id
  FROM loyalty_points
  WHERE user_id = referrer_id_var;
  
  IF referrer_points_id IS NULL THEN
    -- Create loyalty points record for referrer
    INSERT INTO loyalty_points (
      user_id,
      points_balance,
      lifetime_points,
      tier
    )
    VALUES (
      referrer_id_var,
      100,
      100,
      'bronze'
    )
    RETURNING id INTO referrer_points_id;
  ELSE
    -- Update existing loyalty points
    UPDATE loyalty_points
    SET 
      points_balance = points_balance + 100,
      lifetime_points = lifetime_points + 100,
      updated_at = NOW()
    WHERE id = referrer_points_id;
  END IF;
  
  -- Record transaction for referrer
  INSERT INTO loyalty_transactions (
    user_id,
    points,
    transaction_type,
    source,
    reference_id,
    description
  )
  VALUES (
    referrer_id_var,
    100,
    'earn',
    'referral',
    referral_id_var,
    'Referral bonus for successful referral'
  );
  
  -- Award points to referred user
  SELECT id INTO referred_points_id
  FROM loyalty_points
  WHERE user_id = referred_id_param;
  
  IF referred_points_id IS NULL THEN
    -- Create loyalty points record for referred user
    INSERT INTO loyalty_points (
      user_id,
      points_balance,
      lifetime_points,
      tier
    )
    VALUES (
      referred_id_param,
      50,
      50,
      'bronze'
    )
    RETURNING id INTO referred_points_id;
  ELSE
    -- Update existing loyalty points
    UPDATE loyalty_points
    SET 
      points_balance = points_balance + 50,
      lifetime_points = lifetime_points + 50,
      updated_at = NOW()
    WHERE id = referred_points_id;
  END IF;
  
  -- Record transaction for referred user
  INSERT INTO loyalty_transactions (
    user_id,
    points,
    transaction_type,
    source,
    reference_id,
    description
  )
  VALUES (
    referred_id_param,
    50,
    'earn',
    'referral',
    referral_id_var,
    'Welcome bonus for joining via referral'
  );
  
  RETURN true;
END;
$$;

-- Function to get user loyalty status
CREATE OR REPLACE FUNCTION get_loyalty_status(
  user_id_param uuid
)
RETURNS TABLE (
  points_balance integer,
  lifetime_points integer,
  tier text,
  next_tier text,
  points_to_next_tier integer
) 
LANGUAGE plpgsql
AS $$
DECLARE
  points_record loyalty_points%ROWTYPE;
  next_tier_var text;
  points_to_next_tier_var integer;
BEGIN
  -- Get loyalty points record
  SELECT * INTO points_record
  FROM loyalty_points
  WHERE user_id = user_id_param;
  
  -- Create record if it doesn't exist
  IF points_record IS NULL THEN
    INSERT INTO loyalty_points (
      user_id,
      points_balance,
      lifetime_points,
      tier
    )
    VALUES (
      user_id_param,
      0,
      0,
      'bronze'
    )
    RETURNING * INTO points_record;
  END IF;
  
  -- Determine next tier and points needed
  CASE points_record.tier
    WHEN 'bronze' THEN
      next_tier_var := 'silver';
      points_to_next_tier_var := 1000 - points_record.lifetime_points;
    WHEN 'silver' THEN
      next_tier_var := 'gold';
      points_to_next_tier_var := 5000 - points_record.lifetime_points;
    WHEN 'gold' THEN
      next_tier_var := 'platinum';
      points_to_next_tier_var := 10000 - points_record.lifetime_points;
    WHEN 'platinum' THEN
      next_tier_var := NULL;
      points_to_next_tier_var := NULL;
    ELSE
      next_tier_var := NULL;
      points_to_next_tier_var := NULL;
  END CASE;
  
  -- Return result
  RETURN QUERY
  SELECT 
    points_record.points_balance,
    points_record.lifetime_points,
    points_record.tier,
    next_tier_var,
    points_to_next_tier_var;
END;
$$;

-- Function to redeem a reward
CREATE OR REPLACE FUNCTION redeem_reward(
  user_id_param uuid,
  reward_id_param uuid
)
RETURNS TABLE (
  success boolean,
  message text,
  redemption_id uuid,
  redemption_code text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  reward_record loyalty_rewards%ROWTYPE;
  user_points integer;
  user_tier text;
  redemption_id_var uuid;
  redemption_code_var text;
BEGIN
  -- Get reward details
  SELECT * INTO reward_record
  FROM loyalty_rewards
  WHERE id = reward_id_param
  AND is_active = true;
  
  IF reward_record IS NULL THEN
    RETURN QUERY
    SELECT 
      false AS success,
      'Reward not found or inactive' AS message,
      NULL::uuid AS redemption_id,
      NULL::text AS redemption_code;
    RETURN;
  END IF;
  
  -- Get user points and tier
  SELECT points_balance, tier INTO user_points, user_tier
  FROM loyalty_points
  WHERE user_id = user_id_param;
  
  IF user_points IS NULL THEN
    RETURN QUERY
    SELECT 
      false AS success,
      'User has no loyalty points' AS message,
      NULL::uuid AS redemption_id,
      NULL::text AS redemption_code;
    RETURN;
  END IF;
  
  -- Check if user has enough points
  IF user_points < reward_record.points_required THEN
    RETURN QUERY
    SELECT 
      false AS success,
      'Insufficient points' AS message,
      NULL::uuid AS redemption_id,
      NULL::text AS redemption_code;
    RETURN;
  END IF;
  
  -- Check if user meets tier requirement
  IF reward_record.min_tier IS NOT NULL THEN
    IF (user_tier = 'bronze' AND reward_record.min_tier != 'bronze')
       OR (user_tier = 'silver' AND (reward_record.min_tier = 'gold' OR reward_record.min_tier = 'platinum'))
       OR (user_tier = 'gold' AND reward_record.min_tier = 'platinum') THEN
      RETURN QUERY
      SELECT 
        false AS success,
        'Tier requirement not met' AS message,
        NULL::uuid AS redemption_id,
        NULL::text AS redemption_code;
      RETURN;
    END IF;
  END IF;
  
  -- Generate redemption code
  SELECT UPPER(SUBSTRING(MD5(RANDOM()::text) FOR 12)) INTO redemption_code_var;
  
  -- Create redemption record
  INSERT INTO redeemed_rewards (
    user_id,
    reward_id,
    points_used,
    status,
    code,
    expires_at
  )
  VALUES (
    user_id_param,
    reward_id_param,
    reward_record.points_required,
    'active',
    redemption_code_var,
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO redemption_id_var;
  
  -- Deduct points
  UPDATE loyalty_points
  SET 
    points_balance = points_balance - reward_record.points_required,
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
  -- Record transaction
  INSERT INTO loyalty_transactions (
    user_id,
    points,
    transaction_type,
    source,
    reference_id,
    description
  )
  VALUES (
    user_id_param,
    -reward_record.points_required,
    'redeem',
    'reward',
    redemption_id_var,
    'Redeemed reward: ' || reward_record.name
  );
  
  -- Return success
  RETURN QUERY
  SELECT 
    true AS success,
    'Reward redeemed successfully' AS message,
    redemption_id_var AS redemption_id,
    redemption_code_var AS redemption_code;
END;
$$;

