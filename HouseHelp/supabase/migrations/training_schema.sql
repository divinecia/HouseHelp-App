-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  duration_minutes integer,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  is_featured boolean DEFAULT false,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Course modules table
CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Course lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text CHECK (content_type IN ('video', 'text', 'quiz')),
  content_url text,
  content_text text,
  duration_minutes integer,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text CHECK (question_type IN ('multiple_choice', 'true_false', 'text')),
  options jsonb,
  correct_answer text,
  points integer DEFAULT 1,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- User course progress table
CREATE TABLE IF NOT EXISTS user_course_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT NOW(),
  completed_at timestamptz,
  progress_percentage integer DEFAULT 0,
  last_accessed_lesson_id uuid REFERENCES course_lessons(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- User lesson progress table
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE,
  status text CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage integer DEFAULT 0,
  time_spent_seconds integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- User quiz attempts table
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE,
  score integer,
  max_score integer,
  passed boolean,
  answers jsonb,
  started_at timestamptz DEFAULT NOW(),
  completed_at timestamptz,
  time_taken_seconds integer,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number text UNIQUE NOT NULL,
  issue_date timestamptz DEFAULT NOW(),
  expiry_date timestamptz,
  status text CHECK (status IN ('active', 'expired', 'revoked')),
  verification_url text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Create RLS policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Courses can be viewed by anyone
CREATE POLICY "Courses are viewable by everyone" 
ON courses FOR SELECT USING (is_published = true);

-- Course progress can only be viewed/modified by the user
CREATE POLICY "Users can only access their own course progress" 
ON user_course_progress FOR ALL USING (auth.uid() = user_id);

-- Certificate verification function
CREATE OR REPLACE FUNCTION verify_certificate(certificate_number_param text)
RETURNS TABLE (
  is_valid boolean,
  user_name text,
  course_title text,
  issue_date timestamptz,
  expiry_date timestamptz,
  status text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.status != 'revoked' AND (c.expiry_date IS NULL OR c.expiry_date > NOW()) as is_valid,
    p.full_name as user_name,
    co.title as course_title,
    c.issue_date,
    c.expiry_date,
    c.status
  FROM 
    certificates c
    JOIN profiles p ON c.user_id = p.id
    JOIN courses co ON c.course_id = co.id
  WHERE 
    c.certificate_number = certificate_number_param;
END;
$$;

