-- Languages table
CREATE TABLE IF NOT EXISTS languages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  native_name text NOT NULL,
  flag_emoji text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Translations table
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  language_code text NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
  namespace text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(language_code, namespace, key)
);

-- User language preferences
CREATE TABLE IF NOT EXISTS user_language_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;

-- Languages can be viewed by anyone
CREATE POLICY "Languages are viewable by everyone" 
ON languages FOR SELECT USING (is_active = true);

-- Translations can be viewed by anyone
CREATE POLICY "Translations are viewable by everyone" 
ON translations FOR SELECT USING (true);

-- Users can only view/modify their own language preferences
CREATE POLICY "Users can only access their own language preferences" 
ON user_language_preferences FOR ALL USING (auth.uid() = user_id);

-- Function to get translations for a language
CREATE OR REPLACE FUNCTION get_translations(
  language_code_param text,
  namespace_param text DEFAULT NULL
)
RETURNS TABLE (
  namespace text,
  key text,
  value text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.namespace,
    t.key,
    t.value
  FROM 
    translations t
  WHERE 
    t.language_code = language_code_param
    AND (namespace_param IS NULL OR t.namespace = namespace_param);
END;
$$;

-- Function to set user language preference
CREATE OR REPLACE FUNCTION set_user_language(
  user_id_param uuid,
  language_code_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_language_preferences (
    user_id,
    language_code
  )
  VALUES (
    user_id_param,
    language_code_param
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    language_code = language_code_param,
    updated_at = NOW();
END;
$$;

-- Insert default languages
INSERT INTO languages (code, name, native_name, flag_emoji, is_active, is_default)
VALUES 
  ('en', 'English', 'English', '🇺🇸', true, true),
  ('fr', 'French', 'Français', '🇫🇷', true, false),
  ('rw', 'Kinyarwanda', 'Ikinyarwanda', '🇷🇼', true, false),
  ('sw', 'Swahili', 'Kiswahili', '🇹🇿', true, false)
ON CONFLICT (code) DO NOTHING;

