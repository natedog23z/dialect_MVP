'use client';

import { useEffect, useRef } from 'react';
import { MessageSquare, Smile, MoreVertical, Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Message {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system';
  created_at: string;
  replies_count?: number;
  user: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
    };
  };
}

interface MessageListProps {
  messages: Message[];
  currentUser: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
    };
  };
  roomId: string;
  onThreadSelect?: (message: Message) => void;
}

interface DatabaseMessage {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system';
  created_at: string;
  user_id: string;
  room_id: string;
  thread_parent_id?: string | null;
  replies_count?: number;
  replies?: { count: number };
}

export function MessageList({ messages: initialMessages, currentUser, roomId, onThreadSelect }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    console.log('Initial messages:', initialMessages);
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    console.log('Setting up real-time subscription for room:', roomId);
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('Raw payload received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as DatabaseMessage;
            console.log('Checking message:', {
              roomId: newMessage.room_id,
              expectedRoomId: roomId,
              threadParentId: newMessage.thread_parent_id,
              isTopLevel: !newMessage.thread_parent_id
            });
            
            // Only process messages that belong to this room and are top-level (no thread parent)
            if (newMessage.room_id === roomId && !newMessage.thread_parent_id) {
              console.log('Processing top-level message:', newMessage);
              
              // If it's the current user's message, we can use their data directly
              if (newMessage.user_id === currentUser.id) {
                const completeMessage: Message = {
                  id: newMessage.id,
                  content: newMessage.content,
                  message_type: newMessage.message_type,
                  created_at: newMessage.created_at,
                  replies_count: 0,
                  user: {
                    id: currentUser.id,
                    email: currentUser.email,
                    raw_user_meta_data: currentUser.user_metadata
                  }
                };
                console.log('Adding message from current user:', completeMessage);
                setMessages(prev => [...prev, completeMessage]);
              } else {
                // For other users' messages, use a temporary display until the page refreshes
                const completeMessage: Message = {
                  id: newMessage.id,
                  content: newMessage.content,
                  message_type: newMessage.message_type,
                  created_at: newMessage.created_at,
                  replies_count: 0,
                  user: {
                    id: newMessage.user_id,
                    email: 'Loading...',
                    raw_user_meta_data: { full_name: 'Loading...' }
                  }
                };
                console.log('Adding message from other user:', completeMessage);
                setMessages(prev => [...prev, completeMessage]);
              }
            } else if (newMessage.thread_parent_id) {
              // Update reply count for the parent message
              console.log('Updating reply count for message:', newMessage.thread_parent_id);
              setMessages(prev => prev.map(msg => {
                if (msg.id === newMessage.thread_parent_id) {
                  return {
                    ...msg,
                    replies_count: (msg.replies_count || 0) + 1
                  };
                }
                return msg;
              }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription for room:', roomId);
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUser.id, currentUser.email, currentUser.user_metadata]);

  useEffect(() => {
    console.log('Current messages:', messages);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const MessageWithToolbar = ({ message }: { message: Message }) => {
    // Safely access user data with fallbacks
    const user = message.user || { id: 'unknown', email: 'Unknown User', raw_user_meta_data: {} };
    const isCurrentUser = user.id === currentUser?.id;
    const displayName = user.raw_user_meta_data?.full_name || user.email;

    return (
      <div className="flex items-start gap-3 group relative p-4 hover:bg-[#1E2433]">
        <div className="w-10 h-10 rounded-full bg-[#2A2F3F] flex-shrink-0" />
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{displayName}</span>
            <span className="text-sm text-gray-400">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {message.message_type === 'audio' ? (
            <div className="mt-1 p-3 bg-[#1E2433] rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#4477FF] hover:bg-[#3366EE] text-white"
                  onClick={() => setIsPlaying(isPlaying === message.id ? null : message.id)}
                >
                  {isPlaying === message.id ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div className="flex-1 h-1 bg-[#2A2F3F] rounded-full">
                  <div className="w-1/3 h-full bg-[#4477FF] rounded-full" />
                </div>
                <span className="text-sm text-gray-400">0:39</span>
              </div>
            </div>
          ) : (
            <div className="mt-1 p-3 bg-[#1E2433] rounded-lg text-gray-300">
              {message.content}
            </div>
          )}

          <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out flex items-center gap-2 bg-[#2A2F3F] rounded-lg p-1 shadow-lg">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1.5 hover:bg-[#1E2433] text-gray-400 hover:text-white flex items-center gap-1"
              onClick={() => onThreadSelect?.(message)}
            >
              <MessageSquare size={16} />
              {typeof message.replies_count === 'number' && message.replies_count > 0 && (
                <span className="text-xs bg-[#4477FF] text-white px-1.5 rounded-full">
                  {message.replies_count}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="p-1.5 hover:bg-[#1E2433] text-gray-400 hover:text-white">
              <Smile size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="p-1.5 hover:bg-[#1E2433] text-gray-400 hover:text-white">
              <MoreVertical size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-1">
        {messages.map((message) => (
          <MessageWithToolbar key={message.id} message={message} />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
} 