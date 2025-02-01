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

    console.log("[JOIN ROUTE] Attempting to join room:", roomId);
    return joinRoomAction(roomId);
  } catch (error) {
    console.error("[JOIN ROUTE] Error processing join request:", error);
    return NextResponse.json(
      { error: "Failed to process join request" },
      { status: 500 }
    );
  }
} 