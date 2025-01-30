-- Create RLS policies for messages table
CREATE POLICY "Users can insert messages in their rooms"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    room_id IN (
        SELECT room_id 
        FROM room_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view messages in their rooms"
ON public.messages
FOR SELECT
TO authenticated
USING (
    room_id IN (
        SELECT room_id 
        FROM room_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create RLS policies for typing_status table
CREATE POLICY "Users can manage typing status in their rooms"
ON public.typing_status
FOR ALL
TO authenticated
USING (
    room_id IN (
        SELECT room_id 
        FROM room_participants 
        WHERE user_id = auth.uid()
    )
); 