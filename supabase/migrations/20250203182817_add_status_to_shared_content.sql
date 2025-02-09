-- Add status and metadata columns to shared_content table
ALTER TABLE public.shared_content
ADD COLUMN status text CHECK (status IN ('pending', 'scraped', 'failed')) DEFAULT 'pending',
ADD COLUMN last_scraped_at timestamp with time zone,
ADD COLUMN error_message text;

-- Add an index on status for faster queries
CREATE INDEX idx_shared_content_status ON public.shared_content(status);

-- Backfill existing rows to have 'pending' status
UPDATE public.shared_content SET status = 'pending' WHERE status IS NULL; 