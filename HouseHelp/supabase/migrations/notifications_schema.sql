-- Enable the Supabase Realtime extension
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text CHECK (type IN ('booking', 'message', 'payment', 'system', 'review')),
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  attachments jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants jsonb NOT NULL, -- Array of user IDs
  last_message_id uuid,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- User presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('online', 'offline', 'away')),
  last_seen_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can only view their own notifications" 
ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Users can only view messages in conversations they are part of
CREATE POLICY "Users can only view messages in their conversations" 
ON messages FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE participants @> jsonb_build_array(auth.uid())
  )
);

-- Users can only insert messages in conversations they are part of
CREATE POLICY "Users can only insert messages in their conversations" 
ON messages FOR INSERT WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE participants @> jsonb_build_array(auth.uid())
  )
);

-- Users can only view conversations they are part of
CREATE POLICY "Users can only view their conversations" 
ON conversations FOR SELECT USING (
  participants @> jsonb_build_array(auth.uid())
);

-- Users can only view presence of users they have conversations with
CREATE POLICY "Users can only view presence of users they have conversations with" 
ON user_presence FOR SELECT USING (
  user_id IN (
    SELECT jsonb_array_elements_text(participants)::uuid
    FROM conversations
    WHERE participants @> jsonb_build_array(auth.uid())
  )
);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param uuid,
  title_param text,
  body_param text,
  type_param text,
  data_param jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    body,
    type,
    data
  )
  VALUES (
    user_id_param,
    title_param,
    body_param,
    type_param,
    data_param
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  user_id_param uuid,
  notification_ids uuid[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF notification_ids IS NULL THEN
    -- Mark all notifications as read
    UPDATE notifications
    SET is_read = true
    WHERE user_id = user_id_param;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications
    SET is_read = true
    WHERE 
      user_id = user_id_param
      AND id = ANY(notification_ids);
  END IF;
END;
$$;

-- Function to create or get a conversation between users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user_id_1 uuid,
  user_id_2 uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT id INTO conversation_id
  FROM conversations
  WHERE 
    participants @> jsonb_build_array(user_id_1)
    AND participants @> jsonb_build_array(user_id_2)
    AND jsonb_array_length(participants) = 2;
  
  IF conversation_id IS NULL THEN
    -- Create new conversation
    INSERT INTO conversations (
      participants,
      created_at,
      updated_at
    )
    VALUES (
      jsonb_build_array(user_id_1, user_id_2),
      NOW(),
      NOW()
    )
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
  sender_id_param uuid,
  recipient_id_param uuid,
  content_param text,
  attachments_param jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id_var uuid;
  message_id_var uuid;
BEGIN
  -- Get or create conversation
  SELECT get_or_create_conversation(sender_id_param, recipient_id_param)
  INTO conversation_id_var;
  
  -- Insert message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    attachments,
    created_at
  )
  VALUES (
    conversation_id_var,
    sender_id_param,
    content_param,
    attachments_param,
    NOW()
  )
  RETURNING id INTO message_id_var;
  
  -- Update conversation
  UPDATE conversations
  SET 
    last_message_id = message_id_var,
    last_message_at = NOW(),
    updated_at = NOW()
  WHERE id = conversation_id_var;
  
  -- Create notification for recipient
  PERFORM create_notification(
    recipient_id_param,
    'New Message',
    content_param,
    'message',
    jsonb_build_object(
      'conversation_id', conversation_id_var,
      'sender_id', sender_id_param,
      'message_id', message_id_var
    )
  );
  
  RETURN message_id_var;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  user_id_param uuid,
  conversation_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE 
    conversation_id = conversation_id_param
    AND sender_id != user_id_param
    AND is_read = false;
END;
$$;

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  user_id_param uuid,
  status_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_presence (
    user_id,
    status,
    last_seen_at,
    updated_at
  )
  VALUES (
    user_id_param,
    status_param,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = status_param,
    last_seen_at = NOW(),
    updated_at = NOW();
END;
$$;

-- Trigger to automatically set users to offline after inactivity
CREATE OR REPLACE FUNCTION auto_set_offline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_presence
  SET 
    status = 'offline',
    updated_at = NOW()
  WHERE 
    status != 'offline'
    AND last_seen_at < NOW() - INTERVAL '5 minutes';
  
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER auto_set_offline_trigger
AFTER INSERT OR UPDATE ON user_presence
FOR EACH STATEMENT
EXECUTE FUNCTION auto_set_offline();

