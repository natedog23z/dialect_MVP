-- Drop the existing trigger
DROP TRIGGER IF EXISTS url_message_trigger ON public.messages;

-- Update the function to work with AFTER INSERT
CREATE OR REPLACE FUNCTION handle_url_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shared_content_id bigint;
BEGIN
  IF NEW.message_type = 'url' THEN
    -- Insert into shared_content and get the ID
    INSERT INTO public.shared_content (
      message_id,
      content_type,
      content_url,
      status
    ) VALUES (
      NEW.id,
      'url',
      NEW.content,
      'pending'
    )
    RETURNING id INTO v_shared_content_id;

    -- Update the message with the shared_content_id
    UPDATE public.messages
    SET shared_content_id = v_shared_content_id
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create new trigger as AFTER INSERT since we need the NEW.id
CREATE TRIGGER url_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_url_message(); 