"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/signup",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/signup", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/signup",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
};

export const joinRoomAction = async (roomId: string) => {
  console.log("[JOIN ACTION] Starting join room action for roomId:", roomId);
  
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("[JOIN ACTION] User authentication failed:", userError);
      return encodedRedirect("error", "/login", "You must be logged in to join a room");
    }

    console.log("[JOIN ACTION] Authenticated user:", user.id);

    // Check if room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, creator_id')
      .eq('id', roomId)
      .single();

    console.log("[JOIN ACTION] Room lookup result:", { 
      room, 
      error: roomError ? {
        message: roomError.message,
        code: roomError.code,
        details: roomError.details,
        hint: roomError.hint
      } : null 
    });

    if (roomError || !room) {
      console.error("[JOIN ACTION] Room not found:", { roomId, error: roomError });
      return encodedRedirect("error", "/dashboard", `Room not found: ${roomError?.message || 'Unknown error'}`);
    }

    // Check if user is already a participant
    const { data: existingParticipant, error: participantError } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    console.log("[JOIN ACTION] Participant check:", {
      existingParticipant,
      error: participantError ? {
        message: participantError.message,
        code: participantError.code,
        details: participantError.details,
        hint: participantError.hint
      } : null
    });

    if (participantError?.code !== 'PGRST116') { // Not found error is expected
      console.log("[JOIN ACTION] Participant check error:", participantError);
    }

    if (existingParticipant) {
      console.log("[JOIN ACTION] User already in room, redirecting");
      return redirect(`/room/${roomId}`);
    }

    console.log("[JOIN ACTION] Attempting to add user to room:", {
      room_id: roomId,
      user_id: user.id
    });

    // Add user to room_participants
    const { data: joinData, error: joinError } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: user.id
      })
      .select()
      .single();

    console.log("[JOIN ACTION] Join attempt result:", {
      success: !joinError,
      data: joinData,
      error: joinError ? {
        message: joinError.message,
        code: joinError.code,
        details: joinError.details,
        hint: joinError.hint
      } : null
    });

    if (joinError) {
      console.error("[JOIN ACTION] Failed to join room:", joinError);
      return encodedRedirect("error", "/dashboard", `Failed to join room: ${joinError.message}`);
    }

    console.log("[JOIN ACTION] Successfully joined room");
    return redirect(`/room/${roomId}`);
  } catch (error) {
    console.error("[JOIN ACTION] Unexpected error:", error);
    return encodedRedirect("error", "/dashboard", `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
