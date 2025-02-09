-- Enable RLS on scraped_contents if not already enabled
ALTER TABLE public.scraped_contents ENABLE ROW LEVEL SECURITY;

-- Create policy for AI system to read scraped contents
CREATE POLICY "Allow system AI to read scraped contents"
    ON public.scraped_contents
    FOR SELECT
    TO authenticated
    USING (
        (SELECT profile_type FROM public.profiles WHERE id = auth.uid()) = 'system_ai'
        OR
        EXISTS (
            SELECT 1 
            FROM public.room_participants rp
            JOIN public.messages m ON m.room_id = rp.room_id
            JOIN public.shared_content sc ON sc.message_id = m.id
            WHERE sc.id = scraped_contents.shared_content_id
            AND rp.user_id = auth.uid()
        )
    ); 