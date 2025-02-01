export const dynamic = 'force-dynamic';

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { RoomContent } from "@/components/rooms/room-content";

interface PageProps {
  params: Promise<{
    roomId: string;
  }>;
}

interface ProfileUser {
  id: string;
  email: string;
  full_name: string | null;
}

export default async function RoomPage({ params }: PageProps) {
  const supabase = await createClient();
  const { roomId } = await params;  // Async access

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Get room details
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return redirect("/dashboard");
  }

  // Check if user is a participant
  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (participantError || !participant) {
    return redirect("/dashboard");
  }

  // Get initial messages
  const { data: messages } = await supabase
    .from("messages")
    .select(`
      *,
      replies:messages!thread_parent_id(id)
    `)
    .eq("room_id", roomId)
    .is("thread_parent_id", null)  // Only fetch top-level messages
    .order("created_at", { ascending: true })
    .limit(50);

  console.log('Raw messages from Supabase:', messages);

  // Get user data for all messages
  const userIds = Array.from(new Set((messages || []).map(m => m.user_id)));
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  // Combine messages with user data
  const messagesWithUsers = (messages || []).map(message => {
    const messageUser = users?.find(u => u.id === message.user_id) as ProfileUser | undefined;
    const userData = messageUser || {
      id: message.user_id,
      email: 'Loading...',
      full_name: 'Loading...'
    };
    
    // Count the actual number of replies
    const replyCount = Array.isArray(message.replies) ? message.replies.length : 0;
    console.log(`Message ${message.id} has ${replyCount} replies:`, message.replies);
    
    return {
      ...message,
      replies_count: replyCount,
      user: {
        id: userData.id,
        email: userData.email,
        raw_user_meta_data: {
          full_name: userData.full_name || userData.email
        }
      }
    };
  });

  return (
    <RoomContent
      room={room}
      participant={participant}
      messagesWithUsers={messagesWithUsers}
      user={user}
    />
  );
} 