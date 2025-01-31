'use client';

import { useState } from 'react';
import { MessageList } from "@/components/rooms/message-list";
import { MessageInput } from "@/components/rooms/message-input";
import { ThreadPanel } from "@/components/rooms/thread-panel";
import { RoomHeader } from "@/components/rooms/room-header";

interface Message {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system';
  created_at: string;
  user: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
    };
  };
}

interface RoomContentProps {
  room: any;
  participant: any;
  messagesWithUsers: Message[];
  user: any;
}

export function RoomContent({ room, participant, messagesWithUsers, user }: RoomContentProps) {
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  const handleThreadSelect = (message: Message) => {
    setActiveThread(message);
    setIsThreadOpen(true);
  };

  const handleThreadClose = () => {
    setIsThreadOpen(false);
    setActiveThread(null);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0F1C]">
      <RoomHeader 
        room={room}
        participant={participant}
      />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Main Message Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <MessageList 
            messages={messagesWithUsers}
            currentUser={{
              id: user.id,
              email: user.email || '',
              user_metadata: user.user_metadata
            }}
            roomId={room.id}
            onThreadSelect={handleThreadSelect}
          />
          <MessageInput 
            roomId={room.id}
            userId={user.id}
          />
        </div>

        {/* Thread Panel */}
        <ThreadPanel 
          roomId={room.id}
          isOpen={isThreadOpen}
          onClose={handleThreadClose}
          currentUser={{
            id: user.id,
            email: user.email || '',
            user_metadata: user.user_metadata
          }}
          thread={activeThread}
        />
      </main>
    </div>
  );
} 