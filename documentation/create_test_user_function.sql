-- Function to create a test user
CREATE OR REPLACE FUNCTION create_test_user(user_id uuid, email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into auth.users if not exists
  INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    user_id,
    email,
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('is_test_user', true)
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$; 