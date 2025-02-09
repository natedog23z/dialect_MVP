-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to invoke Edge Function
CREATE OR REPLACE FUNCTION invoke_deepseek_summary()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  service_key TEXT;
  http_response JSONB;
  v_room_id BIGINT;
  v_parent_message_id BIGINT;
  v_current_status TEXT;
BEGIN
  -- Early logging
  RAISE LOG 'DeepSeek trigger starting for operation: %, scraped_content_id: %, status: %', 
            TG_OP, NEW.id, NEW.ai_summary_status;

  -- Check if we should process this change
  IF TG_OP = 'INSERT' THEN
    -- For new rows, only process if status is 'pending'
    IF NEW.ai_summary_status != 'pending' THEN
      RAISE LOG 'Skipping: INSERT with non-pending status: %', NEW.ai_summary_status;
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- For updates, only process if:
    -- 1. Status is changing TO 'pending' from something else
    -- 2. Text content changed AND status is still 'pending'
    IF NOT (
      (OLD.ai_summary_status != 'pending' AND NEW.ai_summary_status = 'pending') OR
      (NEW.ai_summary_status = 'pending' AND OLD.text_content IS DISTINCT FROM NEW.text_content)
    ) THEN
      RAISE LOG 'Skipping: UPDATE did not meet criteria. Old status: %, New status: %', 
                OLD.ai_summary_status, NEW.ai_summary_status;
      RETURN NEW;
    END IF;
  END IF;

  -- Use advisory lock to prevent concurrent processing of the same content
  IF NOT pg_try_advisory_xact_lock(NEW.id) THEN
    RAISE LOG 'Could not acquire lock for scraped_content_id: %. Skipping to prevent duplicate processing.', NEW.id;
    RETURN NEW;
  END IF;

  -- Double-check current status (in case it changed while getting lock)
  SELECT ai_summary_status INTO v_current_status
  FROM public.scraped_contents
  WHERE id = NEW.id
  FOR UPDATE;

  IF v_current_status != 'pending' THEN
    RAISE LOG 'Status changed for scraped_content_id: % while waiting for lock. Current status: %', NEW.id, v_current_status;
    RETURN NEW;
  END IF;
    
  -- Get room_id and check for summarize message
  WITH url_message AS (
    SELECT m.room_id, m.id as url_message_id
    FROM public.messages m
    JOIN public.shared_content sc ON sc.message_id = m.id
    WHERE sc.id = NEW.shared_content_id
  ),
  summarize_message AS (
    SELECT msg.id as summarize_msg_id
    FROM public.messages msg
    WHERE msg.content = 'Summarize this link'
    AND msg.thread_parent_id = (SELECT url_message_id FROM url_message)
  )
  SELECT 
    url_message.room_id,
    url_message.url_message_id
  INTO v_room_id, v_parent_message_id
  FROM url_message
  WHERE EXISTS (SELECT 1 FROM summarize_message);
  
  IF v_room_id IS NULL THEN
    RAISE LOG 'Could not find room_id for shared_content_id: % or no summarize message found', NEW.shared_content_id;
    RETURN NEW;
  END IF;

  -- Log the trigger firing
  RAISE LOG 'DeepSeek trigger fired for scraped_content_id: %, room_id: %, parent_message_id: %', 
            NEW.id, v_room_id, v_parent_message_id;
  
  -- Update status to in_progress (we have row lock from FOR UPDATE above)
  UPDATE public.scraped_contents 
  SET ai_summary_status = 'in_progress'
  WHERE id = NEW.id;
  
  -- Insert a system message about processing
  INSERT INTO public.messages (
    room_id,
    user_id,
    content,
    message_type,
    thread_parent_id
  ) VALUES (
    v_room_id,
    '11111111-1111-4111-1111-111111111111', -- Dialect AI system user
    'Processing link summary...',
    'system',
    v_parent_message_id  -- This will be the URL message ID, so everything appears in thread
  );
  
  -- Determine the Edge Function URL based on environment
  edge_function_url := CASE 
    WHEN current_setting('app.settings.environment', TRUE) = 'local' 
    THEN 'http://localhost:54321/functions/v1/process-deepseek-summary'
    ELSE 'https://yqyweqpsumzxsdgmssll.supabase.co/functions/v1/process-deepseek-summary'
  END;

  -- Get service key from environment variable
  BEGIN
    service_key := current_setting('app.settings.service_role_key', TRUE);
    IF service_key IS NULL THEN
      RAISE LOG 'Warning: service_role_key is null';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error getting service_role_key: %', SQLERRM;
  END;
  
  -- Log the request details (excluding sensitive data)
  RAISE LOG 'Calling Edge Function at: %, Content Length: %, Room ID: %', 
            edge_function_url, 
            length(NEW.text_content), 
            v_room_id;
  
  -- Call Edge Function via pg_net
  BEGIN
    http_response := net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, 'service-role-key-not-set')
      ),
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'id', NEW.id,
          'text_content', NEW.text_content,
          'ai_summary_status', NEW.ai_summary_status,
          'shared_content_id', NEW.shared_content_id,
          'room_id', v_room_id
        )
      )
    );
    
    -- Log the response
    RAISE LOG 'Edge Function Response: %', http_response;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    RAISE LOG 'Error calling Edge Function: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    
    -- Update status to failed
    UPDATE public.scraped_contents 
    SET 
      ai_summary_status = 'failed',
      error_message = format('Trigger error: %s', SQLERRM)
    WHERE id = NEW.id;
    
    -- Insert error message in chat
    INSERT INTO public.messages (
      room_id,
      user_id,
      content,
      message_type,
      thread_parent_id
    ) VALUES (
      v_room_id,
      '11111111-1111-4111-1111-111111111111',
      'Failed to process link summary. Please try again.',
      'system',
      v_parent_message_id
    );
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (simplified to catch all inserts and updates)
DROP TRIGGER IF EXISTS deepseek_summary_trigger ON public.scraped_contents;
CREATE TRIGGER deepseek_summary_trigger
  AFTER INSERT OR UPDATE
  ON public.scraped_contents
  FOR EACH ROW
  EXECUTE FUNCTION invoke_deepseek_summary();

-- Set up app settings if they don't exist
DO $$
BEGIN
  -- Set environment to local for development
  PERFORM set_config('app.settings.environment', 'local', FALSE);
  
  -- Set service role key from environment if available
  BEGIN
    PERFORM set_config(
      'app.settings.service_role_key',
      current_setting('SUPABASE_SERVICE_ROLE_KEY', TRUE),
      FALSE
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Could not set service_role_key: %', SQLERRM;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in settings setup: %', SQLERRM;
END $$; 