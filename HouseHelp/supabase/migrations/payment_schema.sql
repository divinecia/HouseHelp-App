-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('mtn', 'airtel', 'card', 'bank')),
  is_default boolean DEFAULT false,
  last_four text,
  expiry_month integer,
  expiry_year integer,
  cardholder_name text,
  phone_number text,
  token_id text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'RWF',
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  provider_transaction_id text,
  provider_response jsonb,
  payment_type text CHECK (payment_type IN ('booking', 'subscription', 'deposit')),
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Payment schedules table
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'RWF',
  frequency text CHECK (frequency IN ('one_time', 'weekly', 'biweekly', 'monthly')),
  next_payment_date timestamptz NOT NULL,
  end_date timestamptz,
  status text CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Wallet table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0,
  currency text DEFAULT 'RWF',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text CHECK (type IN ('deposit', 'withdrawal', 'payment', 'refund')),
  status text CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id uuid,
  description text,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(wallet_id, reference_id)
);

-- Create RLS policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view/modify their own payment methods
CREATE POLICY "Users can only access their own payment methods" 
ON payment_methods FOR ALL USING (auth.uid() = user_id);

-- Users can only view their own transactions
CREATE POLICY "Users can only view their own transactions" 
ON transactions FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own payment schedules
CREATE POLICY "Users can only view their own payment schedules" 
ON payment_schedules FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own wallet
CREATE POLICY "Users can only view their own wallet" 
ON wallets FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own wallet transactions
CREATE POLICY "Users can only view their own wallet transactions" 
ON wallet_transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);

-- Function to get user wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(user_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  balance numeric;
BEGIN
  SELECT w.balance INTO balance
  FROM wallets w
  WHERE w.user_id = user_id_param;
  
  IF balance IS NULL THEN
    -- Create wallet if it doesn't exist
    INSERT INTO wallets (user_id, balance)
    VALUES (user_id_param, 0)
    RETURNING balance INTO balance;
  END IF;
  
  RETURN balance;
END;
$$;

-- Function to process wallet payment
CREATE OR REPLACE FUNCTION process_wallet_payment(
  user_id_param uuid,
  amount_param numeric,
  description_param text,
  reference_id_param uuid
)
RETURNS TABLE (
  success boolean,
  message text,
  transaction_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wallet_id_var uuid;
  balance_var numeric;
  transaction_id_var uuid;
BEGIN
  -- Get wallet ID and balance
  SELECT w.id, w.balance INTO wallet_id_var, balance_var
  FROM wallets w
  WHERE w.user_id = user_id_param;
  
  IF wallet_id_var IS NULL THEN
    -- Create wallet if it doesn't exist
    INSERT INTO wallets (user_id, balance)
    VALUES (user_id_param, 0)
    RETURNING id, balance INTO wallet_id_var, balance_var;
  END IF;
  
  -- Check if balance is sufficient
  IF balance_var < amount_param THEN
    RETURN QUERY SELECT false, 'Insufficient wallet balance', NULL::uuid;
    RETURN;
  END IF;
  
  -- Update wallet balance
  UPDATE wallets
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = wallet_id_var;
  
  -- Create wallet transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    amount,
    type,
    status,
    reference_id,
    description
  )
  VALUES (
    wallet_id_var,
    amount_param,
    'payment',
    'completed',
    reference_id_param,
    description_param
  )
  RETURNING id INTO transaction_id_var;
  
  RETURN QUERY SELECT true, 'Payment successful', transaction_id_var;
END;
$$;

