import React from 'react';
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    roomId: string;
  }>;
}

export default async function RoomLayout({ children, params }: LayoutProps) {
  const supabase = await createClient();
  const { roomId } = await params;  // Async access

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <div>
      {children}
    </div>
  );
} 
