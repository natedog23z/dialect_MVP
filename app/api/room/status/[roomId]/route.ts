import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    console.log("[ROOM STATUS] Checking room:", roomId, "type:", typeof roomId);

    const supabase = await createClient();

    // First, let's get all rooms to see what we're working with
    const { data: allRooms, error: listError } = await supabase
      .from('rooms')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log("[ROOM STATUS] Recent rooms:", allRooms);

    // Now try to get the specific room
    const { data: rooms, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId);

    if (roomError) {
      console.error("[ROOM STATUS] Error fetching room:", roomError);
      return NextResponse.json({ 
        exists: false, 
        error: roomError.message,
        debug: {
          roomId,
          roomIdType: typeof roomId,
          recentRooms: allRooms
        }
      });
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ 
        exists: false, 
        message: "Room not found",
        debug: {
          roomId,
          roomIdType: typeof roomId,
          recentRooms: allRooms
        }
      });
    }

    // Get room participants
    const { data: participants, error: participantsError } = await supabase
      .from('room_participants')
      .select('user_id')
      .eq('room_id', roomId);

    return NextResponse.json({
      exists: true,
      rooms,
      participantCount: participants?.length || 0,
      error: participantsError?.message,
      debug: {
        roomId,
        roomIdType: typeof roomId,
        recentRooms: allRooms
      }
    });
  } catch (error) {
    console.error("[ROOM STATUS] Unexpected error:", error);
    return NextResponse.json({ 
      exists: false, 
      error: "Unexpected error occurred",
      debug: {
        error: String(error)
      }
    });
  }
} 
