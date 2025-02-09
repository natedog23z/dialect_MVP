-- Add type column to shared_content table
ALTER TABLE shared_content 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('text', 'url', 'image')) DEFAULT 'text';

-- Add last_updated_at column if it doesn't exist
ALTER TABLE shared_content 
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have a type
UPDATE shared_content 
SET type = CASE 
    WHEN content_url IS NOT NULL THEN 'url'
    ELSE 'text'
END
WHERE type IS NULL; 