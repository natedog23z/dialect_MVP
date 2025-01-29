import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { InviteLinkDialog } from "@/components/rooms/invite-link-dialog";
import { ArrowLeft } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function RoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  const supabase = await createClient();

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
    .eq("id", params.roomId)
    .single();

  if (roomError || !room) {
    return redirect("/dashboard");
  }

  // Check if user is a participant
  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select("*")
    .eq("room_id", params.roomId)
    .eq("user_id", user.id)
    .single();

  if (participantError || !participant) {
    return redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Room Header */}
      <header className="border-b border-[#1E2538] bg-[#0A0F1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button 
                  variant="ghost" 
                  className="gap-2 text-gray-400 hover:text-white hover:bg-[#2A2F3F] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-[#1E2538]" />
              <h1 className="text-xl font-semibold text-white">{room.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <InviteLinkDialog roomId={room.id.toString()} />
            </div>
          </div>
        </div>
      </header>

      {/* Room Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add your room content here */}
      </main>
    </div>
  );
} 