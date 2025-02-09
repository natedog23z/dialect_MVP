-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create scraped_contents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.scraped_contents (
  id BIGSERIAL PRIMARY KEY,
  shared_content_id BIGINT NOT NULL REFERENCES shared_content(id),
  chunk_index INT DEFAULT 0,       -- For very large text, broken into multiple rows
  text_content TEXT,               -- The scraped full-page text or HTML
  embedding vector(1536),          -- Using pgvector for semantic search later
  meta_data JSONB,                -- Optional for storing additional fragments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ,
  error_message TEXT,
  scrape_attempts INT DEFAULT 0
);

-- Create index for faster lookups by shared_content_id
CREATE INDEX IF NOT EXISTS idx_scraped_contents_shared_content_id
    ON public.scraped_contents (shared_content_id);

-- Add helpful comment
COMMENT ON TABLE public.scraped_contents IS 'Stores full-page scraped content from Firecrawl.dev for extended AI processing'; 