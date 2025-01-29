import { joinRoomAction } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  // Validate roomId is a number
  if (!/^\d+$/.test(roomId)) {
    return new Response("Invalid room ID", { status: 400 });
  }

  return joinRoomAction(roomId);
} 