-- Add 'url' as a valid message type
ALTER TABLE public.messages DROP CONSTRAINT check_message_type;
ALTER TABLE public.messages ADD CONSTRAINT check_message_type 
  CHECK (message_type = ANY (ARRAY['text'::text, 'audio'::text, 'system'::text, 'url'::text])); 