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
}

export function MessageList({ messages: initialMessages, currentUser, roomId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    console.log('Initial messages:', initialMessages);
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
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
          console.log('New message received:', payload);
          if (payload.eventType === 'INSERT') {
            // Fetch the message
            const { data: message, error: messageError } = await supabase
              .from('messages')
              .select('*')
              .eq('id', payload.new.id)
              .single();

            if (messageError) {
              console.error('Error fetching message:', messageError);
              return;
            }

            // Fetch the user data from auth.users
            const { data: userData, error: userError } = await supabase
              .from('auth.users')
              .select('id, email, raw_user_meta_data')
              .eq('id', message.user_id)
              .single();

            if (userError) {
              console.error('Error fetching user:', userError);
              // Try to use currentUser data if it's their message
              if (message.user_id === currentUser.id) {
                const completeMessage = {
                  ...message,
                  user: {
                    id: currentUser.id,
                    email: currentUser.email,
                    raw_user_meta_data: currentUser.user_metadata
                  }
                };
                console.log('Complete message with current user:', completeMessage);
                setMessages(prev => [...prev, completeMessage]);
              } else {
                // Fallback for other users
                const completeMessage = {
                  ...message,
                  user: {
                    id: message.user_id,
                    email: 'Unknown User',
                    raw_user_meta_data: {}
                  }
                };
                console.log('Complete message with fallback user:', completeMessage);
                setMessages(prev => [...prev, completeMessage]);
              }
              return;
            }

            const completeMessage = {
              ...message,
              user: userData
            };

            console.log('Complete message with user:', completeMessage);
            setMessages(prev => [...prev, completeMessage]);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [roomId]);

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
            <Button variant="ghost" size="sm" className="p-1.5 hover:bg-[#1E2433] text-gray-400 hover:text-white">
              <MessageSquare size={16} />
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