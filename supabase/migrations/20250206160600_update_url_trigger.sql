-- Update the URL trigger function to set shared_content_id back on the message
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

-- No need to recreate the trigger as we're just updating the function 