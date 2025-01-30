import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { InviteLinkDialog } from "@/components/rooms/invite-link-dialog";
import { 
  ArrowLeft, 
  Paperclip, 
  Send, 
  MoreVertical, 
  Play, 
  Pause, 
  MessageSquare, 
  Smile, 
  Mic, 
  UserPlus, 
  X 
} from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/rooms/message-list";
import { MessageInput } from "@/components/rooms/message-input";
import { ThreadPanel } from "@/components/rooms/thread-panel";
import { RoomHeader } from "@/components/rooms/room-header";

interface PageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { roomId } = await params;
  return {
    title: `Room ${roomId}`,
  };
}
  
export default async function RoomPage({ params }: PageProps) {
  const supabase = await createClient();
  const { roomId } = await params;

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
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50);

      // Get user data for all messages
  const userIds = Array.from(new Set((messages || []).map(m => m.user_id)));
      const { data: users } = await supabase
        .from("auth.users")
        .select("id, email, raw_user_meta_data")
        .in("id", userIds);

      // Combine messages with user data
  const messagesWithUsers = (messages || []).map(message => {
    const messageUser = users?.find(u => u.id === message.user_id) || {
          id: message.user_id,
          email: user.email,
          raw_user_meta_data: user.user_metadata
        };
        
        return {
          ...message,
          user: messageUser
        };
      });

  return (
    <div className="flex flex-col h-screen bg-[#0A0F1C]">
      <RoomHeader 
        room={room}
        participant={participant}
      />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Main Message Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <MessageList 
            messages={messagesWithUsers}
            currentUser={{
              id: user.id,
              email: user.email || '',
              user_metadata: user.user_metadata
            }}
            roomId={roomId}
          />
          <MessageInput 
            roomId={roomId}
            userId={user.id}
          />
        </div>

        {/* Thread Panel - Client Component will handle show/hide */}
        <ThreadPanel roomId={roomId} />
      </main>
    </div>
  );
} 