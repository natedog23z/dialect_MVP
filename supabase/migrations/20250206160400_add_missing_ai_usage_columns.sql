-- Add missing columns to ai_usage_logs table
ALTER TABLE public.ai_usage_logs
ADD COLUMN IF NOT EXISTS duration_ms integer,
ADD COLUMN IF NOT EXISTS token_count integer,
ADD COLUMN IF NOT EXISTS error text; 