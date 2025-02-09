-- Drop the constraint that's missing 'url'
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS check_message_type;

-- Add the constraint back with ALL message types
ALTER TABLE public.messages
  ADD CONSTRAINT check_message_type 
  CHECK (message_type = ANY (ARRAY[
    'text'::text, 
    'audio'::text, 
    'system'::text, 
    'url'::text,
    'ai_response'::text
  ]));

-- Update the comment to include all types
COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text, audio, system, url, or ai_response'; 