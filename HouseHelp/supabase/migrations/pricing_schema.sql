-- Service packages table
CREATE TABLE IF NOT EXISTS service_packages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Service pricing table
CREATE TABLE IF NOT EXISTS service_pricing (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type text NOT NULL,
  package_id uuid REFERENCES service_packages(id) ON DELETE CASCADE,
  price_hourly numeric NOT NULL,
  price_daily numeric,
  price_weekly numeric,
  price_monthly numeric,
  min_hours integer DEFAULT 1,
  discount_percentage numeric DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(service_type, package_id)
);

-- Worker pricing overrides (for experienced workers)
CREATE TABLE IF NOT EXISTS worker_pricing_overrides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid REFERENCES worker_profiles(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  price_hourly numeric NOT NULL,
  price_daily numeric,
  price_weekly numeric,
  price_monthly numeric,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(worker_id, service_type)
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL,
  price_yearly numeric,
  features jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status text CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  is_auto_renew boolean DEFAULT true,
  payment_method_id text,
  last_payment_date timestamptz,
  next_payment_date timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  min_order_value numeric DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Function to get pricing for a service
CREATE OR REPLACE FUNCTION get_service_pricing(
  service_type_param text,
  package_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  service_type text,
  package_id uuid,
  package_name text,
  price_hourly numeric,
  price_daily numeric,
  price_weekly numeric,
  price_monthly numeric,
  min_hours integer,
  discount_percentage numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.service_type,
    sp.package_id,
    pkg.name as package_name,
    sp.price_hourly,
    sp.price_daily,
    sp.price_weekly,
    sp.price_monthly,
    sp.min_hours,
    sp.discount_percentage
  FROM 
    service_pricing sp
    JOIN service_packages pkg ON sp.package_id = pkg.id
  WHERE 
    sp.service_type = service_type_param
    AND (package_id_param IS NULL OR sp.package_id = package_id_param)
    AND pkg.is_active = true
  ORDER BY 
    sp.price_hourly ASC;
END;
$$;

-- Function to get worker-specific pricing
CREATE OR REPLACE FUNCTION get_worker_pricing(
  worker_id_param uuid,
  service_type_param text DEFAULT NULL
)
RETURNS TABLE (
  service_type text,
  price_hourly numeric,
  price_daily numeric,
  price_weekly numeric,
  price_monthly numeric,
  is_custom boolean
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH worker_services AS (
    SELECT 
      jsonb_array_elements_text(services) as service
    FROM 
      worker_profiles
    WHERE 
      id = worker_id_param
  ),
  base_pricing AS (
    SELECT 
      sp.service_type,
      sp.price_hourly,
      sp.price_daily,
      sp.price_weekly,
      sp.price_monthly,
      false as is_custom
    FROM 
      service_pricing sp
      JOIN service_packages pkg ON sp.package_id = pkg.id
    WHERE 
      pkg.is_active = true
      AND sp.package_id = (
        SELECT id FROM service_packages WHERE name = 'Standard' LIMIT 1
      )
  ),
  override_pricing AS (
    SELECT 
      wpo.service_type,
      wpo.price_hourly,
      wpo.price_daily,
      wpo.price_weekly,
      wpo.price_monthly,
      true as is_custom
    FROM 
      worker_pricing_overrides wpo
    WHERE 
      wpo.worker_id = worker_id_param
  )
  
  SELECT 
    COALESCE(op.service_type, bp.service_type) as service_type,
    COALESCE(op.price_hourly, bp.price_hourly) as price_hourly,
    COALESCE(op.price_daily, bp.price_daily) as price_daily,
    COALESCE(op.price_weekly, bp.price_weekly) as price_weekly,
    COALESCE(op.price_monthly, bp.price_monthly) as price_monthly,
    COALESCE(op.is_custom, bp.is_custom) as is_custom
  FROM 
    worker_services ws
    LEFT JOIN override_pricing op ON ws.service = op.service_type
    LEFT JOIN base_pricing bp ON ws.service = bp.service_type
  WHERE 
    service_type_param IS NULL OR ws.service = service_type_param;
END;
$$;

-- Function to validate a discount code
CREATE OR REPLACE FUNCTION validate_discount_code(
  code_param text,
  order_value_param numeric
)
RETURNS TABLE (
  is_valid boolean,
  discount_type text,
  discount_value numeric,
  error_message text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH code_check AS (
    SELECT 
      dc.*,
      CASE
        WHEN dc.id IS NULL THEN 'Invalid discount code'
        WHEN dc.is_active = false THEN 'Discount code is inactive'
        WHEN dc.start_date IS NOT NULL AND dc.start_date > NOW() THEN 'Discount code is not yet active'
        WHEN dc.end_date IS NOT NULL AND dc.end_date < NOW() THEN 'Discount code has expired'
        WHEN dc.max_uses IS NOT NULL AND dc.current_uses >= dc.max_uses THEN 'Discount code usage limit reached'
        WHEN dc.min_order_value > order_value_param THEN 'Order value too low for this discount code'
        ELSE NULL
      END as error_msg
    FROM 
      discount_codes dc
    WHERE 
      dc.code = code_param
  )
  
  SELECT 
    CASE WHEN cc.error_msg IS NULL THEN true ELSE false END as is_valid,
    cc.discount_type,
    cc.discount_value,
    cc.error_msg
  FROM 
    code_check cc;
END;
$$;

