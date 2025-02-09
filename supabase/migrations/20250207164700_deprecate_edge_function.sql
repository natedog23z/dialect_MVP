-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS deepseek_summary_trigger ON public.scraped_contents;
DROP FUNCTION IF EXISTS invoke_deepseek_summary();

-- We'll keep the ai_summary_status column and other table structures
-- as they'll be used by the new microservice

-- Add comment to document the deprecation
COMMENT ON TABLE public.scraped_contents IS 'Stores full-page scraped content from Firecrawl.dev. AI processing moved from edge functions to microservice architecture.';

-- No need for pg_net extension anymore as HTTP calls will be handled by the microservice
-- However, we won't drop it as it might be used by other parts of the application 