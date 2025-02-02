import { joinRoomAction } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    console.log("[JOIN ROUTE] Received join request:", {
      url: request.url,
      method: request.method,
    });

    const { roomId } = await params;
    console.log("[JOIN ROUTE] Extracted roomId:", roomId);
    
    // Basic validation that roomId exists
    if (!roomId) {
      console.error("[JOIN ROUTE] Invalid room ID - roomId is empty");
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      );
    }

    // Verify auth status before proceeding
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("[JOIN ROUTE] Auth status:", {
      authenticated: !!user,
      userId: user?.id,
      error: authError?.message
    });

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const roomIdNum = parseInt(roomId);
    console.log("[JOIN ROUTE] Attempting to join room:", roomIdNum);

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomIdNum)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return NextResponse.redirect(new URL(`/room/${roomIdNum}`, request.url));
    }

    // Try to join the room directly
    const { error: joinError } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomIdNum,
        user_id: user.id
      });

    // If join fails due to foreign key constraint, the room doesn't exist
    if (joinError?.code === '23503') { // Foreign key violation
      console.error("[JOIN ROUTE] Room not found:", { roomId: roomIdNum, error: joinError });
      return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent('Room not found')}`, request.url));
    }

    if (joinError) {
      console.error("[JOIN ROUTE] Join error:", joinError);
      return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent('Failed to join room')}`, request.url));
    }

    return NextResponse.redirect(new URL(`/room/${roomIdNum}`, request.url));
  } catch (error) {
    console.error("[JOIN ROUTE] Error processing join request:", error);
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent('An unexpected error occurred')}`, request.url));
  }
} 