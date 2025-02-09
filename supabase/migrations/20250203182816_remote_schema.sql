create policy "Read user profiles in shared rooms"
on "auth"."users"
as permissive
for select
to authenticated
using ((id IN ( SELECT room_participants.user_id
   FROM room_participants
  WHERE (room_participants.room_id IN ( SELECT room_participants_1.room_id
           FROM room_participants room_participants_1
          WHERE (room_participants_1.user_id = auth.uid()))))));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


