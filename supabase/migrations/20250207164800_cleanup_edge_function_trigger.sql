-- Drop the old trigger and function if they exist
DROP TRIGGER IF EXISTS deepseek_summary_trigger ON public.scraped_contents;
DROP FUNCTION IF EXISTS invoke_deepseek_summary();

-- Reset any failed records back to pending
UPDATE public.scraped_contents
SET 
  ai_summary_status = 'pending',
  error_message = NULL
WHERE 
  ai_summary_status = 'failed' 
  AND error_message LIKE '%function net.http_post%'; 