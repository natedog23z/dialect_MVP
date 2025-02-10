-- Drop existing constraint to add new message type
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS check_message_type;

-- Add the constraint back with 'system_status' included
ALTER TABLE public.messages
  ADD CONSTRAINT check_message_type 
  CHECK (message_type = ANY (ARRAY[
    'text'::text, 
    'audio'::text, 
    'system'::text, 
    'url'::text,
    'ai_response'::text,
    'system_status'::text
  ]));

-- Create index for efficient system status message queries
CREATE INDEX IF NOT EXISTS idx_messages_system_status 
ON messages(message_type) 
WHERE message_type = 'system_status';

-- Create the System Status user
DO $$
DECLARE
    system_status_uuid UUID := '22222222-2222-4222-2222-222222222222'::UUID;
BEGIN
    -- Insert into auth.users if not exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = system_status_uuid) THEN
        INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, is_sso_user, banned_until, role)
        VALUES (
            system_status_uuid,
            'system-status@dialect.so',
            NOW(),
            NOW(),
            NOW(),
            FALSE,
            NULL,
            'authenticated'
        );
    END IF;

    -- Insert into public.profiles if not exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = system_status_uuid) THEN
        INSERT INTO public.profiles (id, email, full_name, profile_type)
        VALUES (
            system_status_uuid,
            'system-status@dialect.so',
            'System Status',
            'system_ai'
        );
    END IF;
END $$;

-- Update message type column comment
COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text, audio, system, url, ai_response, or system_status';

-- Add policy for system status user to insert messages in any room
CREATE POLICY "Allow system status to insert messages in any room"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid() = '22222222-2222-4222-2222-222222222222'::UUID)
        OR
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_participants.room_id = messages.room_id
            AND room_participants.user_id = auth.uid()
        )
    ); 