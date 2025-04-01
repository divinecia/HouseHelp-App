-- Incident categories table
CREATE TABLE IF NOT EXISTS incident_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid,
  category_id uuid REFERENCES incident_categories(id),
  title text NOT NULL,
  description text NOT NULL,
  status text CHECK (status IN ('submitted', 'under_review', 'in_progress', 'resolved', 'closed')),
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  location jsonb,
  incident_date timestamptz,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Incident attachments table
CREATE TABLE IF NOT EXISTS incident_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text,
  created_at timestamptz DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status text CHECK (status IN ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')),
  priority text CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Support ticket messages table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_from_support boolean DEFAULT false,
  message text NOT NULL,
  attachments jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE incident_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Incident categories can be viewed by anyone
CREATE POLICY "Incident categories are viewable by everyone" 
ON incident_categories FOR SELECT USING (is_active = true);

-- Users can only view their own incidents
CREATE POLICY "Users can only view their own incidents" 
ON incidents FOR SELECT USING (auth.uid() = user_id);

-- Users can only view attachments for their own incidents
CREATE POLICY "Users can only view attachments for their own incidents" 
ON incident_attachments FOR SELECT USING (
  incident_id IN (
    SELECT id FROM incidents WHERE user_id = auth.uid()
  )
);

-- Users can only view their own support tickets
CREATE POLICY "Users can only view their own support tickets" 
ON support_tickets FOR SELECT USING (auth.uid() = user_id);

-- Users can only view messages for their own support tickets
CREATE POLICY "Users can only view messages for their own support tickets" 
ON support_ticket_messages FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM support_tickets WHERE user_id = auth.uid()
  )
);

-- Function to report an incident
CREATE OR REPLACE FUNCTION report_incident(
  user_id_param uuid,
  booking_id_param uuid,
  category_id_param uuid,
  title_param text,
  description_param text,
  priority_param text,
  location_param jsonb DEFAULT NULL,
  incident_date_param timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  incident_id uuid;
BEGIN
  INSERT INTO incidents (
    user_id,
    booking_id,
    category_id,
    title,
    description,
    status,
    priority,
    location,
    incident_date
  )
  VALUES (
    user_id_param,
    booking_id_param,
    category_id_param,
    title_param,
    description_param,
    'submitted',
    priority_param,
    location_param,
    COALESCE(incident_date_param, NOW())
  )
  RETURNING id INTO incident_id;
  
  -- Create notification for admin
  PERFORM create_notification(
    '00000000-0000-0000-0000-000000000000', -- Admin user ID
    'New Incident Reported',
    title_param,
    'incident',
    jsonb_build_object(
      'incident_id', incident_id,
      'user_id', user_id_param,
      'priority', priority_param
    )
  );
  
  RETURN incident_id;
END;
$$;

-- Function to add attachment to incident
CREATE OR REPLACE FUNCTION add_incident_attachment(
  incident_id_param uuid,
  file_url_param text,
  file_type_param text,
  file_name_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attachment_id uuid;
  user_id_var uuid;
BEGIN
  -- Check if incident belongs to the user
  SELECT user_id INTO user_id_var
  FROM incidents
  WHERE id = incident_id_param;
  
  IF user_id_var != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Add attachment
  INSERT INTO incident_attachments (
    incident_id,
    file_url,
    file_type,
    file_name
  )
  VALUES (
    incident_id_param,
    file_url_param,
    file_type_param,
    file_name_param
  )
  RETURNING id INTO attachment_id;
  
  RETURN attachment_id;
END;
$$;

-- Function to create a support ticket
CREATE OR REPLACE FUNCTION create_support_ticket(
  user_id_param uuid,
  subject_param text,
  description_param text,
  priority_param text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_id uuid;
BEGIN
  INSERT INTO support_tickets (
    user_id,
    subject,
    description,
    status,
    priority
  )
  VALUES (
    user_id_param,
    subject_param,
    description_param,
    'open',
    priority_param
  )
  RETURNING id INTO ticket_id;
  
  -- Create notification for admin
  PERFORM create_notification(
    '00000000-0000-0000-0000-000000000000', -- Admin user ID
    'New Support Ticket',
    subject_param,
    'support',
    jsonb_build_object(
      'ticket_id', ticket_id,
      'user_id', user_id_param,
      'priority', priority_param
    )
  );
  
  RETURN ticket_id;
END;
$$;

-- Function to add message to support ticket
CREATE OR REPLACE FUNCTION add_ticket_message(
  ticket_id_param uuid,
  user_id_param uuid,
  message_param text,
  attachments_param jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_id uuid;
  ticket_user_id uuid;
  is_from_support_var boolean;
BEGIN
  -- Get ticket owner
  SELECT user_id INTO ticket_user_id
  FROM support_tickets
  WHERE id = ticket_id_param;
  
  -- Check if user is ticket owner or support staff
  IF user_id_param != ticket_user_id AND NOT (SELECT is_support_staff FROM user_roles WHERE user_id = user_id_param) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Determine if message is from support
  is_from_support_var := user_id_param != ticket_user_id;
  
  -- Add message
  INSERT INTO support_ticket_messages (
    ticket_id,
    user_id,
    is_from_support,
    message,
    attachments
  )
  VALUES (
    ticket_id_param,
    user_id_param,
    is_from_support_var,
    message_param,
    attachments_param
  )
  RETURNING id INTO message_id;
  
  -- Update ticket status
  UPDATE support_tickets
  SET 
    status = CASE 
      WHEN is_from_support_var THEN 'waiting_for_customer'
      ELSE 'in_progress'
    END,
    updated_at = NOW()
  WHERE id = ticket_id_param;
  
  -- Create notification for recipient
  IF is_from_support_var THEN
    -- Notify customer
    PERFORM create_notification(
      ticket_user_id,
      'New Support Response',
      'You have a new response to your support ticket',
      'support',
      jsonb_build_object(
        'ticket_id', ticket_id_param,
        'message_id', message_id
      )
    );
  ELSE
    -- Notify support staff
    PERFORM create_notification(
      COALESCE((SELECT assigned_to FROM support_tickets WHERE id = ticket_id_param), '00000000-0000-0000-0000-000000000000'),
      'New Customer Response',
      'A customer has responded to a support ticket',
      'support',
      jsonb_build_object(
        'ticket_id', ticket_id_param,
        'message_id', message_id,
        'user_id', user_id_param
      )
    );
  END IF;
  
  RETURN message_id;
END;
$$;

