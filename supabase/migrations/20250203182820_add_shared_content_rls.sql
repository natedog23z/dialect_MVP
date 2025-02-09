-- Create RLS policies for shared_content table
CREATE POLICY "Users can insert shared content in their rooms"
ON public.shared_content
FOR INSERT
TO authenticated
WITH CHECK (
    message_id IN (
        SELECT id 
        FROM public.messages 
        WHERE room_id IN (
            SELECT room_id 
            FROM room_participants 
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can view shared content in their rooms"
ON public.shared_content
FOR SELECT
TO authenticated
USING (
    message_id IN (
        SELECT id 
        FROM public.messages 
        WHERE room_id IN (
            SELECT room_id 
            FROM room_participants 
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update shared content in their rooms"
ON public.shared_content
FOR UPDATE
TO authenticated
USING (
    message_id IN (
        SELECT id 
        FROM public.messages 
        WHERE room_id IN (
            SELECT room_id 
            FROM room_participants 
            WHERE user_id = auth.uid()
        )
    )
)
WITH CHECK (
    message_id IN (
        SELECT id 
        FROM public.messages 
        WHERE room_id IN (
            SELECT room_id 
            FROM room_participants 
            WHERE user_id = auth.uid()
        )
    )
); 