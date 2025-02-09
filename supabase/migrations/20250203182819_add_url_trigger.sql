-- Create function to handle URL messages
CREATE OR REPLACE FUNCTION handle_url_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message_type = 'url' THEN
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
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS url_message_trigger ON public.messages;
CREATE TRIGGER url_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_url_message(); 