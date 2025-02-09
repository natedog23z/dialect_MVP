-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create scraped_contents table
CREATE TABLE IF NOT EXISTS public.scraped_contents (
  id BIGSERIAL PRIMARY KEY,
  shared_content_id BIGINT NOT NULL REFERENCES shared_content(id),
  chunk_index INT DEFAULT 0,       -- For very large text, broken into multiple rows
  text_content TEXT,               -- The scraped full-page text or HTML
  embedding vector(1536),          -- Using pgvector for semantic search later
  meta_data JSONB,                 -- Optional for storing additional fragments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ,
  error_message TEXT,
  scrape_attempts INT DEFAULT 0
);

-- Create index for faster lookups by shared_content_id
CREATE INDEX IF NOT EXISTS idx_scraped_contents_shared_content_id
    ON public.scraped_contents (shared_content_id);

-- Create an enum type for status values if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scrape_status') THEN
        CREATE TYPE scrape_status AS ENUM ('pending', 'scraped', 'failed');
    END IF;
END $$;

-- Handle the status column in shared_content
DO $$ 
BEGIN 
    -- Drop the existing status column if it exists
    IF EXISTS (SELECT 1 
               FROM information_schema.columns 
               WHERE table_schema = 'public'
               AND table_name = 'shared_content'
               AND column_name = 'status') THEN
        ALTER TABLE public.shared_content DROP COLUMN status;
    END IF;

    -- Add the column with the correct type
    ALTER TABLE public.shared_content 
    ADD COLUMN status scrape_status DEFAULT 'pending';
END $$;

-- Add a comment to the table
COMMENT ON TABLE public.scraped_contents IS 'Stores full-page scraped content from Firecrawl.dev for extended AI processing'; 