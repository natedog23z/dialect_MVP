-- Add shared_content_id column to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS shared_content_id bigint REFERENCES public.shared_content(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS messages_shared_content_id_idx ON public.messages(shared_content_id); 