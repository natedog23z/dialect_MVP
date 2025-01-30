'use client';

import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InviteLinkDialog } from "./invite-link-dialog";

interface RoomHeaderProps {
  room: {
    id: string;
    name: string;
  };
  participant: {
    id: string;
  };
}

export function RoomHeader({ room, participant }: RoomHeaderProps) {
  return (
    <header className="border-b border-[#1E2538] bg-[#0A0F1C] flex-shrink-0">
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
  );
} 