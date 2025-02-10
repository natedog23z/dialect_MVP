'use client';

import { useState, useEffect } from 'react';
import { MessageList } from "@/components/rooms/message-list";
import { MessageInput } from "@/components/rooms/message-input";
import { ThreadPanel } from "@/components/rooms/thread-panel";
import { RoomHeader } from "@/components/rooms/room-header";
import { createClient } from '@/utils/supabase/client';

interface Message {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system' | 'url' | 'system_status' | 'ai_response';
  created_at: string;
  replies_count?: number;
  thread_parent_id?: string | null;
  user: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
    };
  };
  shared_content?: {
    status: 'pending' | 'scraped' | 'failed';
    processed_data?: {
      title?: string;
      description?: string;
      image?: string;
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
  const [isThreadExpanded, setIsThreadExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>(messagesWithUsers);
  const supabase = createClient();

  const refreshMessages = async () => {
    console.log('Refreshing messages for room:', room.id);
    const { data: updatedMessages, error } = await supabase
      .from("messages")
      .select(`
        *,
        replies:messages!thread_parent_id(id),
        shared_content!messages_shared_content_id_fkey(*)
      `)
      .eq("room_id", room.id)
      .is("thread_parent_id", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    console.log('Updated messages from Supabase:', updatedMessages);

    if (updatedMessages) {
      // Get user data for all messages
      const userIds = Array.from(new Set(updatedMessages.map(m => m.user_id)));
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (userError) {
        console.error('Error fetching users:', userError);
        return;
      }

      const messagesWithUsers = updatedMessages.map(message => {
        const messageUser = users?.find(u => u.id === message.user_id);
        const userData = messageUser || {
          id: message.user_id,
          email: 'Loading...',
          full_name: 'Loading...'
        };
        
        // Count the actual number of replies
        const replyCount = Array.isArray(message.replies) ? message.replies.length : 0;
        console.log(`Message ${message.id} has ${replyCount} replies:`, message.replies);
        
        return {
          ...message,
          replies_count: replyCount,
          user: {
            id: userData.id,
            email: userData.email,
            raw_user_meta_data: {
              full_name: userData.full_name || userData.email
            }
          }
        };
      });

      setMessages(messagesWithUsers);
    }
  };

  // Set up real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `room_id=eq.${room.id}`
        },
        async (payload) => {
          console.log('New message received:', payload);
          // Refresh all messages to ensure consistency
          refreshMessages();
        }
      )
      .subscribe();

    // Initial load
    refreshMessages();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  const handleThreadSelect = (message: Message) => {
    setActiveThread(message);
    setIsThreadOpen(true);
  };

  const handleThreadClose = () => {
    refreshMessages(); // Refresh messages when closing thread panel
    setIsThreadOpen(false);
    setIsThreadExpanded(false);
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
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isThreadExpanded ? 'hidden' : 'block'}`}>
          <MessageList 
            messages={messages}
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
          onReplyAdded={refreshMessages}
          isExpanded={isThreadExpanded}
          onExpandToggle={(expanded) => setIsThreadExpanded(expanded)}
        />
      </main>
    </div>
  );
} 