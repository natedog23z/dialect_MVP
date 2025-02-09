-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS deepseek_summary_trigger ON public.scraped_contents;
DROP FUNCTION IF EXISTS invoke_deepseek_summary();

-- Create simplified function to invoke Edge Function
CREATE OR REPLACE FUNCTION invoke_deepseek_summary()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  service_key TEXT;
BEGIN
  -- Determine the Edge Function URL based on environment
  edge_function_url := CASE 
    WHEN current_setting('app.settings.environment', TRUE) = 'local' 
    THEN 'http://localhost:54321/functions/v1/process-deepseek-summary'
    ELSE 'https://yqyweqpsumzxsdgmssll.supabase.co/functions/v1/process-deepseek-summary'
  END;

  -- Get service key from environment variable
  service_key := current_setting('app.settings.service_role_key', TRUE);
  
  -- Call Edge Function via pg_net
  PERFORM net.http_post(
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
        'room_id', NEW.room_id,
        'user_id', NEW.user_id
      )
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors and update status
  UPDATE public.scraped_contents 
  SET 
    ai_summary_status = 'failed',
    error_message = format('Trigger error: %s', SQLERRM)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create simplified trigger that only fires on INSERT
CREATE TRIGGER deepseek_summary_trigger
  AFTER INSERT
  ON public.scraped_contents
  FOR EACH ROW
  EXECUTE FUNCTION invoke_deepseek_summary(); 