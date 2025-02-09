-- Add profile_type to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_type text NOT NULL DEFAULT 'human'
CHECK (profile_type IN ('human','system_ai','other'));

-- Create the Dialect AI system user
-- Note: Using a DO block to handle the conditional insert
DO $$
DECLARE
    dialect_ai_uuid UUID := '11111111-1111-4111-1111-111111111111'::UUID;
BEGIN
    -- Insert into auth.users if not exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = dialect_ai_uuid) THEN
        INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, is_sso_user, banned_until, role)
        VALUES (
            dialect_ai_uuid,
            'ai-system@dialect.so',
            NOW(),
            NOW(),
            NOW(),
            FALSE,
            NULL,
            'authenticated'
        );
    END IF;

    -- Insert into public.profiles if not exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = dialect_ai_uuid) THEN
        INSERT INTO public.profiles (id, email, full_name, profile_type)
        VALUES (
            dialect_ai_uuid,
            'ai-system@dialect.so',
            'Dialect AI',
            'system_ai'
        );
    END IF;
END $$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow system AI to read any room content" ON public.messages;
DROP POLICY IF EXISTS "Allow system AI to insert messages in any room" ON public.messages;

-- Create policy for AI system to read any room content
CREATE POLICY "Allow system AI to read any room content"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        (SELECT profile_type FROM public.profiles WHERE id = auth.uid()) = 'system_ai'
        OR
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_participants.room_id = messages.room_id
            AND room_participants.user_id = auth.uid()
        )
    );

-- Create policy for AI system to insert messages in any room
CREATE POLICY "Allow system AI to insert messages in any room"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT profile_type FROM public.profiles WHERE id = auth.uid()) = 'system_ai'
        OR
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_participants.room_id = messages.room_id
            AND room_participants.user_id = auth.uid()
        )
    );

-- Add comment explaining the system user
COMMENT ON TABLE public.profiles IS 'User profiles including both human users and system users like Dialect AI'; 