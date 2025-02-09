create table "public"."ai_usage_logs" (
    "id" bigint generated always as identity not null,
    "room_id" bigint,
    "user_id" uuid,
    "llm_model" text not null,
    "query_text" text not null,
    "response_size" integer,
    "estimated_cost" numeric(10,4),
    "created_at" timestamp with time zone default now()
);


alter table "public"."ai_usage_logs" enable row level security;

create table "public"."message_reactions" (
    "id" bigint generated always as identity not null,
    "message_id" bigint,
    "user_id" uuid,
    "reaction" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."message_reactions" enable row level security;

create table "public"."messages" (
    "id" bigint generated always as identity not null,
    "room_id" bigint not null,
    "user_id" uuid not null,
    "content" text not null,
    "thread_parent_id" bigint,
    "created_at" timestamp with time zone default now(),
    "message_type" text default 'text'::text
);


alter table "public"."messages" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "avatar_url" text,
    "updated_at" timestamp with time zone default now()
);


alter table "public"."profiles" enable row level security;

create table "public"."room_participants" (
    "id" bigint generated always as identity not null,
    "room_id" bigint not null,
    "user_id" uuid not null,
    "joined_at" timestamp with time zone default now()
);


alter table "public"."room_participants" enable row level security;

create table "public"."rooms" (
    "id" bigint generated always as identity not null,
    "name" text not null,
    "creator_id" uuid not null,
    "max_participants" integer default 12,
    "created_at" timestamp with time zone default now()
);


alter table "public"."rooms" enable row level security;

create table "public"."shared_content" (
    "id" bigint generated always as identity not null,
    "message_id" bigint not null,
    "content_type" text not null,
    "content_url" text,
    "processed_data" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."shared_content" enable row level security;

create table "public"."typing_status" (
    "room_id" bigint not null,
    "user_id" uuid not null,
    "last_typed" timestamp with time zone default now()
);


alter table "public"."typing_status" enable row level security;

CREATE UNIQUE INDEX ai_usage_logs_pkey ON public.ai_usage_logs USING btree (id);

CREATE INDEX idx_message_reactions_message_id ON public.message_reactions USING btree (message_id);

CREATE INDEX idx_message_reactions_user_id ON public.message_reactions USING btree (user_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);

CREATE INDEX idx_messages_room_id ON public.messages USING btree (room_id);

CREATE INDEX idx_messages_type ON public.messages USING btree (message_type);

CREATE INDEX idx_room_participants_room_id ON public.room_participants USING btree (room_id);

CREATE INDEX idx_room_participants_user_id ON public.room_participants USING btree (user_id);

CREATE INDEX idx_rooms_creator_id ON public.rooms USING btree (creator_id);

CREATE INDEX idx_typing_status_room_id ON public.typing_status USING btree (room_id);

CREATE UNIQUE INDEX message_reactions_message_id_user_id_reaction_key ON public.message_reactions USING btree (message_id, user_id, reaction);

CREATE UNIQUE INDEX message_reactions_pkey ON public.message_reactions USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX room_participants_pkey ON public.room_participants USING btree (id);

CREATE UNIQUE INDEX room_participants_room_id_user_id_key ON public.room_participants USING btree (room_id, user_id);

CREATE UNIQUE INDEX rooms_pkey ON public.rooms USING btree (id);

CREATE UNIQUE INDEX shared_content_pkey ON public.shared_content USING btree (id);

CREATE UNIQUE INDEX typing_status_pkey ON public.typing_status USING btree (room_id, user_id);

alter table "public"."ai_usage_logs" add constraint "ai_usage_logs_pkey" PRIMARY KEY using index "ai_usage_logs_pkey";

alter table "public"."message_reactions" add constraint "message_reactions_pkey" PRIMARY KEY using index "message_reactions_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."room_participants" add constraint "room_participants_pkey" PRIMARY KEY using index "room_participants_pkey";

alter table "public"."rooms" add constraint "rooms_pkey" PRIMARY KEY using index "rooms_pkey";

alter table "public"."shared_content" add constraint "shared_content_pkey" PRIMARY KEY using index "shared_content_pkey";

alter table "public"."typing_status" add constraint "typing_status_pkey" PRIMARY KEY using index "typing_status_pkey";

alter table "public"."ai_usage_logs" add constraint "ai_usage_logs_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL not valid;

alter table "public"."ai_usage_logs" validate constraint "ai_usage_logs_room_id_fkey";

alter table "public"."ai_usage_logs" add constraint "ai_usage_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."ai_usage_logs" validate constraint "ai_usage_logs_user_id_fkey";

alter table "public"."message_reactions" add constraint "message_reactions_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_message_id_fkey";

alter table "public"."message_reactions" add constraint "message_reactions_message_id_user_id_reaction_key" UNIQUE using index "message_reactions_message_id_user_id_reaction_key";

alter table "public"."message_reactions" add constraint "message_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_user_id_fkey";

alter table "public"."messages" add constraint "check_message_type" CHECK ((message_type = ANY (ARRAY['text'::text, 'audio'::text, 'system'::text]))) not valid;

alter table "public"."messages" validate constraint "check_message_type";

alter table "public"."messages" add constraint "fk_room" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "fk_room";

alter table "public"."messages" add constraint "messages_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_room_id_fkey";

alter table "public"."messages" add constraint "messages_thread_parent_id_fkey" FOREIGN KEY (thread_parent_id) REFERENCES messages(id) ON DELETE SET NULL not valid;

alter table "public"."messages" validate constraint "messages_thread_parent_id_fkey";

alter table "public"."messages" add constraint "messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."room_participants" add constraint "fk_room" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."room_participants" validate constraint "fk_room";

alter table "public"."room_participants" add constraint "room_participants_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."room_participants" validate constraint "room_participants_room_id_fkey";

alter table "public"."room_participants" add constraint "room_participants_room_id_user_id_key" UNIQUE using index "room_participants_room_id_user_id_key";

alter table "public"."room_participants" add constraint "room_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."room_participants" validate constraint "room_participants_user_id_fkey";

alter table "public"."rooms" add constraint "rooms_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES auth.users(id) not valid;

alter table "public"."rooms" validate constraint "rooms_creator_id_fkey";

alter table "public"."shared_content" add constraint "shared_content_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."shared_content" validate constraint "shared_content_message_id_fkey";

alter table "public"."typing_status" add constraint "typing_status_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;

alter table "public"."typing_status" validate constraint "typing_status_room_id_fkey";

alter table "public"."typing_status" add constraint "typing_status_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."typing_status" validate constraint "typing_status_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_room_participants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  delete from public.room_participants
  where room_id = old.id; -- "old.id" refers to the room being deleted
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_messages_with_reply_counts(p_room_id uuid)
 RETURNS TABLE(id uuid, content text, created_at timestamp with time zone, user_id uuid, message_type text, room_id uuid, thread_parent_id uuid, reply_count bigint, user_email text, user_full_name text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m.created_at,
        m.user_id,
        m.message_type,
        m.room_id,
        m.thread_parent_id,
        COUNT(r.id) as reply_count,
        p.email as user_email,
        p.full_name as user_full_name
    FROM messages m
    LEFT JOIN messages r ON r.thread_parent_id = m.id
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.room_id = p_room_id 
    AND m.thread_parent_id IS NULL
    GROUP BY m.id, m.content, m.created_at, m.user_id, m.message_type, m.room_id, m.thread_parent_id, p.email, p.full_name
    ORDER BY m.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$function$
;

grant delete on table "public"."ai_usage_logs" to "anon";

grant insert on table "public"."ai_usage_logs" to "anon";

grant references on table "public"."ai_usage_logs" to "anon";

grant select on table "public"."ai_usage_logs" to "anon";

grant trigger on table "public"."ai_usage_logs" to "anon";

grant truncate on table "public"."ai_usage_logs" to "anon";

grant update on table "public"."ai_usage_logs" to "anon";

grant delete on table "public"."ai_usage_logs" to "authenticated";

grant insert on table "public"."ai_usage_logs" to "authenticated";

grant references on table "public"."ai_usage_logs" to "authenticated";

grant select on table "public"."ai_usage_logs" to "authenticated";

grant trigger on table "public"."ai_usage_logs" to "authenticated";

grant truncate on table "public"."ai_usage_logs" to "authenticated";

grant update on table "public"."ai_usage_logs" to "authenticated";

grant delete on table "public"."ai_usage_logs" to "service_role";

grant insert on table "public"."ai_usage_logs" to "service_role";

grant references on table "public"."ai_usage_logs" to "service_role";

grant select on table "public"."ai_usage_logs" to "service_role";

grant trigger on table "public"."ai_usage_logs" to "service_role";

grant truncate on table "public"."ai_usage_logs" to "service_role";

grant update on table "public"."ai_usage_logs" to "service_role";

grant delete on table "public"."message_reactions" to "anon";

grant insert on table "public"."message_reactions" to "anon";

grant references on table "public"."message_reactions" to "anon";

grant select on table "public"."message_reactions" to "anon";

grant trigger on table "public"."message_reactions" to "anon";

grant truncate on table "public"."message_reactions" to "anon";

grant update on table "public"."message_reactions" to "anon";

grant delete on table "public"."message_reactions" to "authenticated";

grant insert on table "public"."message_reactions" to "authenticated";

grant references on table "public"."message_reactions" to "authenticated";

grant select on table "public"."message_reactions" to "authenticated";

grant trigger on table "public"."message_reactions" to "authenticated";

grant truncate on table "public"."message_reactions" to "authenticated";

grant update on table "public"."message_reactions" to "authenticated";

grant delete on table "public"."message_reactions" to "service_role";

grant insert on table "public"."message_reactions" to "service_role";

grant references on table "public"."message_reactions" to "service_role";

grant select on table "public"."message_reactions" to "service_role";

grant trigger on table "public"."message_reactions" to "service_role";

grant truncate on table "public"."message_reactions" to "service_role";

grant update on table "public"."message_reactions" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."room_participants" to "anon";

grant insert on table "public"."room_participants" to "anon";

grant references on table "public"."room_participants" to "anon";

grant select on table "public"."room_participants" to "anon";

grant trigger on table "public"."room_participants" to "anon";

grant truncate on table "public"."room_participants" to "anon";

grant update on table "public"."room_participants" to "anon";

grant delete on table "public"."room_participants" to "authenticated";

grant insert on table "public"."room_participants" to "authenticated";

grant references on table "public"."room_participants" to "authenticated";

grant select on table "public"."room_participants" to "authenticated";

grant trigger on table "public"."room_participants" to "authenticated";

grant truncate on table "public"."room_participants" to "authenticated";

grant update on table "public"."room_participants" to "authenticated";

grant delete on table "public"."room_participants" to "service_role";

grant insert on table "public"."room_participants" to "service_role";

grant references on table "public"."room_participants" to "service_role";

grant select on table "public"."room_participants" to "service_role";

grant trigger on table "public"."room_participants" to "service_role";

grant truncate on table "public"."room_participants" to "service_role";

grant update on table "public"."room_participants" to "service_role";

grant delete on table "public"."rooms" to "anon";

grant insert on table "public"."rooms" to "anon";

grant references on table "public"."rooms" to "anon";

grant select on table "public"."rooms" to "anon";

grant trigger on table "public"."rooms" to "anon";

grant truncate on table "public"."rooms" to "anon";

grant update on table "public"."rooms" to "anon";

grant delete on table "public"."rooms" to "authenticated";

grant insert on table "public"."rooms" to "authenticated";

grant references on table "public"."rooms" to "authenticated";

grant select on table "public"."rooms" to "authenticated";

grant trigger on table "public"."rooms" to "authenticated";

grant truncate on table "public"."rooms" to "authenticated";

grant update on table "public"."rooms" to "authenticated";

grant delete on table "public"."rooms" to "service_role";

grant insert on table "public"."rooms" to "service_role";

grant references on table "public"."rooms" to "service_role";

grant select on table "public"."rooms" to "service_role";

grant trigger on table "public"."rooms" to "service_role";

grant truncate on table "public"."rooms" to "service_role";

grant update on table "public"."rooms" to "service_role";

grant delete on table "public"."shared_content" to "anon";

grant insert on table "public"."shared_content" to "anon";

grant references on table "public"."shared_content" to "anon";

grant select on table "public"."shared_content" to "anon";

grant trigger on table "public"."shared_content" to "anon";

grant truncate on table "public"."shared_content" to "anon";

grant update on table "public"."shared_content" to "anon";

grant delete on table "public"."shared_content" to "authenticated";

grant insert on table "public"."shared_content" to "authenticated";

grant references on table "public"."shared_content" to "authenticated";

grant select on table "public"."shared_content" to "authenticated";

grant trigger on table "public"."shared_content" to "authenticated";

grant truncate on table "public"."shared_content" to "authenticated";

grant update on table "public"."shared_content" to "authenticated";

grant delete on table "public"."shared_content" to "service_role";

grant insert on table "public"."shared_content" to "service_role";

grant references on table "public"."shared_content" to "service_role";

grant select on table "public"."shared_content" to "service_role";

grant trigger on table "public"."shared_content" to "service_role";

grant truncate on table "public"."shared_content" to "service_role";

grant update on table "public"."shared_content" to "service_role";

grant delete on table "public"."typing_status" to "anon";

grant insert on table "public"."typing_status" to "anon";

grant references on table "public"."typing_status" to "anon";

grant select on table "public"."typing_status" to "anon";

grant trigger on table "public"."typing_status" to "anon";

grant truncate on table "public"."typing_status" to "anon";

grant update on table "public"."typing_status" to "anon";

grant delete on table "public"."typing_status" to "authenticated";

grant insert on table "public"."typing_status" to "authenticated";

grant references on table "public"."typing_status" to "authenticated";

grant select on table "public"."typing_status" to "authenticated";

grant trigger on table "public"."typing_status" to "authenticated";

grant truncate on table "public"."typing_status" to "authenticated";

grant update on table "public"."typing_status" to "authenticated";

grant delete on table "public"."typing_status" to "service_role";

grant insert on table "public"."typing_status" to "service_role";

grant references on table "public"."typing_status" to "service_role";

grant select on table "public"."typing_status" to "service_role";

grant trigger on table "public"."typing_status" to "service_role";

grant truncate on table "public"."typing_status" to "service_role";

grant update on table "public"."typing_status" to "service_role";

create policy "Users can manage their reactions"
on "public"."message_reactions"
as permissive
for all
to authenticated
using ((message_id IN ( SELECT messages.id
   FROM messages
  WHERE (messages.room_id IN ( SELECT room_participants.room_id
           FROM room_participants
          WHERE (room_participants.user_id = auth.uid()))))));


create policy "Enable realtime for messages"
on "public"."messages"
as permissive
for select
to public
using ((room_id IN ( SELECT room_participants.room_id
   FROM room_participants
  WHERE (room_participants.user_id = auth.uid()))));


create policy "Users can delete their own messages"
on "public"."messages"
as permissive
for delete
to authenticated
using ((user_id = auth.uid()));


create policy "Users can insert messages in their rooms"
on "public"."messages"
as permissive
for insert
to authenticated
with check ((room_id IN ( SELECT room_participants.room_id
   FROM room_participants
  WHERE (room_participants.user_id = auth.uid()))));


create policy "Users can update their own messages"
on "public"."messages"
as permissive
for update
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "Users can view messages in their rooms"
on "public"."messages"
as permissive
for select
to authenticated
using ((room_id IN ( SELECT room_participants.room_id
   FROM room_participants
  WHERE (room_participants.user_id = auth.uid()))));


create policy "Public profiles are viewable by everyone"
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view all profiles"
on "public"."profiles"
as permissive
for select
to authenticated
using (true);


create policy "Users can join rooms"
on "public"."room_participants"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "Users can leave rooms"
on "public"."room_participants"
as permissive
for delete
to authenticated
using ((user_id = auth.uid()));


create policy "Users can view their room participations"
on "public"."room_participants"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "Users can create rooms"
on "public"."rooms"
as permissive
for insert
to authenticated
with check ((auth.uid() = creator_id));


create policy "Users can view their rooms"
on "public"."rooms"
as permissive
for select
to authenticated
using (((id IN ( SELECT room_participants.room_id
   FROM room_participants
  WHERE (room_participants.user_id = auth.uid()))) OR (creator_id = auth.uid())));


create policy "Users can manage their typing status"
on "public"."typing_status"
as permissive
for all
to authenticated
using ((room_id IN ( SELECT room_participants.room_id
   FROM room_participants
  WHERE (room_participants.user_id = auth.uid()))));


create policy "Users can manage typing status in their rooms"
on "public"."typing_status"
as permissive
for all
to authenticated
using ((room_id IN ( SELECT room_participants.room_id
   FROM room_participants
  WHERE (room_participants.user_id = auth.uid()))));


CREATE TRIGGER before_room_delete BEFORE DELETE ON public.rooms FOR EACH ROW EXECUTE FUNCTION delete_room_participants();


