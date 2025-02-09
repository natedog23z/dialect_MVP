-- Add scrape_attempts column to shared_content table
ALTER TABLE shared_content 
ADD COLUMN IF NOT EXISTS scrape_attempts INTEGER DEFAULT 0;

-- Update existing rows to have default value
UPDATE shared_content 
SET scrape_attempts = 0 
WHERE scrape_attempts IS NULL; 