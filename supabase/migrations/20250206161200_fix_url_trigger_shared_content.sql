-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS url_message_trigger ON public.messages;
DROP FUNCTION IF EXISTS handle_url_message();

-- Create function to handle URL messages with proper shared_content_id update
CREATE OR REPLACE FUNCTION handle_url_message()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER url_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_url_message();

-- Add helpful comment
COMMENT ON FUNCTION handle_url_message() IS 'Trigger function to create shared_content records for URL messages and update the message with shared_content_id'; 