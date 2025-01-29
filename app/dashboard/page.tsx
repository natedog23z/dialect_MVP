import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions";
import { Users, Settings, MessageSquare, Calendar, ChevronRight } from 'lucide-react';
import { CreateRoomDialog } from "@/components/rooms/create-room-dialog";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
}

interface RoomParticipant {
  room: Room;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch rooms where user is a participant
  const { data: rooms } = await supabase
    .from('room_participants')
    .select(`
      room:rooms (
        id,
        name,
        creator_id,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { foreignTable: 'rooms', ascending: false });

  const userRooms = ((rooms || []) as unknown as Array<{ room: Room }>).map(r => r.room);

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Navigation */}
      <nav className="border-b border-[#1E2538]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side */}
            <div className="flex items-center">
              <div className="text-xl font-bold text-white">Dialect</div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2A2F3F] flex items-center justify-center">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                {user.email}
              </div>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Settings className="h-5 w-5" />
              </button>
              <form action={signOutAction}>
                <Button variant="ghost" size="sm" type="submit" className="text-gray-400 hover:text-white transition-colors">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Your Rooms</h1>
            <p className="text-gray-400 text-sm">Collaborate and share ideas in real-time</p>
          </div>
          <CreateRoomDialog />
        </div>

        {userRooms.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-[#1E2538] rounded-xl">
            <div className="bg-[#2A2F3F] rounded-full p-6 mb-6">
              <Users className="h-12 w-12 text-[#4477FF]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Create your first room</h2>
            <p className="text-gray-400 mb-8 max-w-md">
              Rooms are intimate spaces for up to 12 people to collaborate, share ideas, and create together.
            </p>
          </div>
        ) : (
          // Room List
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRooms.map((room) => (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className="group block bg-[#1E2538] rounded-xl p-6 hover:bg-[#252B3B] transition-all duration-200 border border-transparent hover:border-[#4477FF]/20"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#2A2F3F] rounded-lg">
                    <MessageSquare className="h-6 w-6 text-[#4477FF]" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-[#4477FF] transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#4477FF] transition-colors">
                  {room.name}
                </h3>
                <div className="flex items-center text-sm text-gray-400">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(room.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 