## Room Management System 
-- Create Rooms table
create table public.rooms (
  id bigint primary key generated always as identity,
  name text not null,
  creator_id uuid references auth.users not null,
  max_participants int default 12,
  created_at timestamp with time zone default now()
);

-- Create Room Participants table
create table public.room_participants (
  id bigint primary key generated always as identity,
  room_id bigint not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique (room_id, user_id) -- Prevent duplicate entries
);

-- Create Messages table (for chat history)
create table public.messages (
  id bigint primary key generated always as identity,
  room_id bigint not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  thread_parent_id bigint references public.messages(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Create Shared Content table (for URLs/files)
create table public.shared_content (
  id bigint primary key generated always as identity,
  message_id bigint not null references public.messages(id) on delete cascade,
  content_type text not null, -- 'url', 'file', 'text'
  content_url text,
  processed_data jsonb, -- Store Crawl4AI results
  created_at timestamp with time zone default now()
);

-- Create AI Usage Logs table
create table public.ai_usage_logs (
  id bigint primary key generated always as identity,
  room_id bigint references public.rooms(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  llm_model text not null,
  query_text text not null,
  response_size int,
  estimated_cost numeric(10,4),
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS) for all tables
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.messages enable row level security;
alter table public.shared_content enable row level security;
alter table public.ai_usage_logs enable row level security;

-- Create indexes for better performance
create index idx_rooms_creator_id on public.rooms (creator_id);
create index idx_room_participants_user_id on public.room_participants (user_id);
create index idx_messages_room_id on public.messages (room_id);

## Room Access Control Policy 
-- Drop the existing broad policy
DROP POLICY IF EXISTS "Users can manage their rooms" ON public.rooms;

-- Create specific policies for rooms
CREATE POLICY "Users can create rooms"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view their rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT room_id 
        FROM room_participants 
        WHERE user_id = auth.uid()
    )
    OR creator_id = auth.uid()
);

-- Allow users to view rooms when joining
CREATE POLICY "Users can view rooms when joining"
ON public.rooms
FOR SELECT
TO authenticated
USING (true);  -- Allow any authenticated user to view room details

Index for Room Participants 
create index idx_room_participants_room_id on public.room_participants (room_id);
create index idx_messages_created_at on public.messages (created_at);

## Delete Room Participants
-- 1. Create a function to delete participants when a room is deleted
create or replace function delete_room_participants()
returns trigger as $$
begin
  delete from public.room_participants
  where room_id = old.id; -- "old.id" refers to the room being deleted
  return old;
end;
$$ language plpgsql security definer;

-- 2. Attach the function to the rooms table
create trigger before_room_delete
before delete on public.rooms
for each row execute function delete_room_participants();