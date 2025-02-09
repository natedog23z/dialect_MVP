-- Add ai_summary_status column to scraped_contents
ALTER TABLE public.scraped_contents
ADD COLUMN ai_summary_status text
  CHECK (ai_summary_status in ('pending','in_progress','completed','failed'))
  DEFAULT 'pending';

-- Add an index to improve query performance on status
CREATE INDEX idx_scraped_contents_ai_summary_status 
  ON public.scraped_contents(ai_summary_status);

-- Add helpful comment
COMMENT ON COLUMN public.scraped_contents.ai_summary_status IS 'Tracks the status of AI summary generation for scraped content'; 