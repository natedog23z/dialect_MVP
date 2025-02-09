-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Update shared_content table
ALTER TABLE shared_content 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('text', 'url', 'image')) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'processing', 'scraped', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create scraped_contents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.scraped_contents (
  id BIGSERIAL PRIMARY KEY,
  shared_content_id BIGINT NOT NULL REFERENCES shared_content(id),
  chunk_index INT DEFAULT 0,       -- For very large text, broken into multiple rows
  text_content TEXT,               -- The scraped full-page text or HTML
  embedding vector(1536),          -- Using pgvector for semantic search later
  meta_data JSONB,                 -- Optional for storing additional fragments
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by shared_content_id
CREATE INDEX IF NOT EXISTS idx_scraped_contents_shared_content_id
    ON public.scraped_contents (shared_content_id);

-- Update existing shared_content rows
UPDATE shared_content 
SET 
  type = CASE 
    WHEN content_url IS NOT NULL THEN 'url'
    ELSE 'text'
  END,
  status = COALESCE(status, 'pending'),
  last_updated_at = NOW()
WHERE type IS NULL; 