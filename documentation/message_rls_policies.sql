-- Create RLS policies for messages table
CREATE POLICY "Users can insert messages in their rooms"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    room_id IN (
        SELECT room_id 
        FROM room_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view messages in their rooms"
ON public.messages
FOR SELECT
TO authenticated
USING (
    room_id IN (
        SELECT room_id 
        FROM room_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create RLS policies for typing_status table
CREATE POLICY "Users can manage typing status in their rooms"
ON public.typing_status
FOR ALL
TO authenticated
USING (
    room_id IN (
        SELECT room_id 
        FROM room_participants 
        WHERE user_id = auth.uid()
    )
);

-- Create profiles table that mirrors auth.users
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see other users' basic info
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, raw_user_meta_data)
  VALUES (new.id, new.email, new.raw_user_meta_data);
  RETURN new;
END;
$$;

-- Create a trigger to automatically create profile records
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 