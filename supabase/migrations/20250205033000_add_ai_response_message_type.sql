-- First, drop the existing constraint
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS check_message_type;

-- Add the constraint back with 'ai_response' included
ALTER TABLE public.messages
  ADD CONSTRAINT check_message_type 
  CHECK (message_type = ANY (ARRAY['text'::text, 'audio'::text, 'system'::text, 'ai_response'::text]));

-- Add helpful comment
COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text, audio, system, or ai_response. AI responses are from Dialect AI system user.'; 