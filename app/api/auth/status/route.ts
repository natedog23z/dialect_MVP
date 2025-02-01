import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error("[AUTH STATUS] Error fetching user:", error);
      return NextResponse.json({ authenticated: false, error: error.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ authenticated: false, message: "No user found" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      }
    });
  } catch (error) {
    console.error("[AUTH STATUS] Unexpected error:", error);
    return NextResponse.json({ authenticated: false, error: "Unexpected error occurred" }, { status: 500 });
  }
} 