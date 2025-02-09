-- Fix the trigger function to correctly handle http_post body
CREATE OR REPLACE FUNCTION invoke_deepseek_summary()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  service_key TEXT;
  v_room_id BIGINT;
  v_user_id UUID;
  request_body TEXT;
BEGIN
  -- Log the trigger firing
  RAISE NOTICE 'DeepSeek trigger firing for scraped_content_id: %, status: %', NEW.id, NEW.ai_summary_status;

  -- Get room_id through the relationships
  SELECT m.room_id, m.user_id INTO v_room_id, v_user_id
  FROM public.shared_content sc
  JOIN public.messages m ON m.id = sc.message_id
  WHERE sc.id = NEW.shared_content_id;

  RAISE NOTICE 'Found room_id: %, user_id: % for shared_content_id: %', v_room_id, v_user_id, NEW.shared_content_id;

  -- Determine the Edge Function URL based on environment
  edge_function_url := CASE 
    WHEN current_setting('app.settings.environment', TRUE) = 'local' 
    THEN 'http://localhost:54321/functions/v1/process-deepseek-summary'
    ELSE 'https://yqyweqpsumzxsdgmssll.supabase.co/functions/v1/process-deepseek-summary'
  END;

  RAISE NOTICE 'Calling edge function at: %', edge_function_url;

  -- Get service key from environment variable
  service_key := current_setting('app.settings.service_role_key', TRUE);
  
  -- Create the request body as a JSON string
  request_body := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'text_content', NEW.text_content,
      'ai_summary_status', NEW.ai_summary_status,
      'shared_content_id', NEW.shared_content_id,
      'room_id', v_room_id,
      'user_id', v_user_id
    )
  )::text;
  
  -- Call Edge Function via pg_net with text body
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, 'service-role-key-not-set')
    )::text,
    body := request_body
  );

  RAISE NOTICE 'Edge function called successfully for scraped_content_id: %', NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors and update status
  RAISE WARNING 'Error in DeepSeek trigger for scraped_content_id %: %', NEW.id, SQLERRM;
  
  UPDATE public.scraped_contents 
  SET 
    ai_summary_status = 'failed',
    error_message = format('Trigger error: %s', SQLERRM)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 