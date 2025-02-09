'use client';

import { useEffect, useRef } from 'react';
import { MessageSquare, Smile, MoreVertical, Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UrlPreviewCard } from './url-preview-card';

interface Message {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system' | 'url';
  created_at: string;
  replies_count?: number;
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
  message_type: 'text' | 'audio' | 'system' | 'url';
  created_at: string;
  user_id: string;
  room_id: string;
  thread_parent_id?: string | null;
  replies_count?: number;
  replies?: { count: number };
}

interface SharedContent {
  id: string;
  message_id: string;
  status: 'pending' | 'scraped' | 'failed';
  processed_data?: {
    title?: string;
    description?: string;
    image?: string;
  };
}

export function MessageList({ messages: initialMessages, currentUser, roomId, onThreadSelect }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [summarizingUrls, setSummarizingUrls] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Function to fetch shared content for a message
  const fetchSharedContent = async (messageId: string) => {
    const { data, error } = await supabase
      .from('shared_content')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (error) {
      console.error('Error fetching shared content:', error);
      return null;
    }

    return data;
  };

  // Function to handle summarize request
  const handleSummarize = async (url: string, messageId: string) => {
    // Add URL to summarizing state
    setSummarizingUrls(prev => new Set(prev).add(url));

    try {
      // Get the shared_content record for this message
      const { data: sharedContent, error: sharedContentError } = await supabase
        .from('shared_content')
        .select('id')
        .eq('message_id', messageId)
        .single();

      if (sharedContentError) throw sharedContentError;

      if (!sharedContent) {
        throw new Error('No shared content found for this message');
      }

      // Call the deep scraping endpoint
      const response = await fetch('/api/scrape/deep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          sharedContentId: sharedContent.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start deep scraping');
      }

      // Send a "Summarize this link" message as a thread reply
      const { error: summaryRequestError } = await supabase
        .from('messages')
        .insert({
          content: 'Summarize this link',
          message_type: 'text',
          room_id: roomId,
          user_id: currentUser.id,
          thread_parent_id: messageId // This makes it a thread reply
        });

      if (summaryRequestError) throw summaryRequestError;

    } catch (error) {
      console.error('Error requesting summary:', error);
    } finally {
      // Remove URL from summarizing state
      setSummarizingUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  // Fetch shared content for initial URL messages
  useEffect(() => {
    const fetchInitialSharedContent = async () => {
      const updatedMessages = await Promise.all(
        initialMessages.map(async (message) => {
          if (message.message_type === 'url') {
            const sharedContent = await fetchSharedContent(message.id);
            return {
              ...message,
              shared_content: sharedContent
            };
          }
          return message;
        })
      );
      setMessages(updatedMessages);
    };

    fetchInitialSharedContent();
  }, [initialMessages]);

  useEffect(() => {
    console.log('Setting up real-time subscriptions for room:', roomId);
    
    // Channel for new messages
    const messageChannel = supabase
      .channel(`room-${roomId}-messages`)
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
              
              // Fetch shared content if it's a URL message
              let sharedContent = null;
              if (newMessage.message_type === 'url') {
                sharedContent = await fetchSharedContent(newMessage.id);
              }
              
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
                    raw_user_meta_data: {
                      full_name: currentUser.user_metadata?.full_name || currentUser.email
                    }
                  },
                  shared_content: sharedContent
                };
                console.log('Adding message from current user:', completeMessage);
                setMessages(prev => [...prev, completeMessage]);
              } else {
                // For other users' messages, fetch their data through the API
                try {
                  console.log('Fetching user data for:', newMessage.user_id);
                  const response = await fetch(`/api/user/${newMessage.user_id}`);
                  if (!response.ok) {
                    console.error('API Error:', {
                      status: response.status,
                      statusText: response.statusText
                    });
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Error response:', errorData);
                    throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
                  }
                  const userData = await response.json();
                  console.log('Fetched user data:', userData);

                  // Validate the user data
                  if (!userData || !userData.id || userData.id !== newMessage.user_id) {
                    console.error('Invalid user data received:', {
                      expected: newMessage.user_id,
                      received: userData
                    });
                    throw new Error('Invalid user data received');
                  }

                  const completeMessage: Message = {
                    id: newMessage.id,
                    content: newMessage.content,
                    message_type: newMessage.message_type,
                    created_at: newMessage.created_at,
                    replies_count: 0,
                    user: userData,
                    shared_content: sharedContent
                  };
                  console.log('Adding message with fetched user data:', completeMessage);
                  setMessages(prev => [...prev, completeMessage]);
                } catch (error) {
                  console.error('Error fetching user data:', error);
                  // Add message with temporary user data that will be updated on page refresh
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
                    },
                    shared_content: sharedContent
                  };
                  console.log('Adding message with temporary user data:', completeMessage);
                  setMessages(prev => [...prev, completeMessage]);
                }
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
        console.log('Message subscription status:', status);
      });

    // Channel for shared_content updates
    const sharedContentChannel = supabase
      .channel(`room-${roomId}-shared-content`)
      .on('postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE)
          schema: 'public',
          table: 'shared_content'
        },
        async (payload) => {
          console.log('Shared content update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const sharedContent = payload.new as SharedContent;
            
            // Update the message that contains this shared content
            setMessages(prev => prev.map(message => {
              if (message.id === sharedContent.message_id) {
                return {
                  ...message,
                  shared_content: {
                    status: sharedContent.status,
                    processed_data: sharedContent.processed_data
                  }
                };
              }
              return message;
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('Shared content subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscriptions for room:', roomId);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(sharedContentChannel);
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

    // Function to render message content
    const renderMessageContent = (content: string, type: string, message: Message) => {
      if (type === 'url') {
        return (
          <>
            <a 
              href={content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4477FF] hover:text-[#3366EE] hover:underline break-all"
            >
              {content}
            </a>
            {message.shared_content && (
              <UrlPreviewCard
                url={content}
                title={message.shared_content.processed_data?.title}
                description={message.shared_content.processed_data?.description}
                imageUrl={message.shared_content.processed_data?.image}
                status={message.shared_content.status}
                onSummarize={() => handleSummarize(content, message.id)}
                isSummarizing={summarizingUrls.has(content)}
              />
            )}
          </>
        );
      }
      return content;
    };

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
              {renderMessageContent(message.content, message.message_type, message)}
            </div>
          )}

          {/* Thread count - permanently visible when there are replies */}
          {typeof message.replies_count === 'number' && message.replies_count > 0 && (
            <button 
              onClick={() => onThreadSelect?.(message)}
              className="mt-2 flex items-center gap-1.5 text-[#4477FF] hover:text-[#3366EE] text-sm"
            >
              <MessageSquare size={14} />
              <span>
                {message.replies_count} {message.replies_count === 1 ? 'reply' : 'replies'}
              </span>
            </button>
          )}

          {/* Hover toolbar for actions */}
          <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out flex items-center gap-2 bg-[#2A2F3F] rounded-lg p-1 shadow-lg">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1.5 hover:bg-[#1E2433] text-gray-400 hover:text-white"
              onClick={() => onThreadSelect?.(message)}
            >
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