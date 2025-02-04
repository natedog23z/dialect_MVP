'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { createClient } from '@/utils/supabase/client';

// Add helper function to detect URLs
const detectAndRenderUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 hover:underline"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

interface Thread {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system';
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
  replies?: Thread[];
}

interface ThreadPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
    };
  };
  thread: Thread | null;
  onReplyAdded?: () => void;
}

interface DatabaseMessage {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system';
  created_at: string;
  user_id: string;
  thread_parent_id?: string;
  room_id: string;
}

interface DatabaseUser {
  id: string;
  email: string;
  full_name?: string;
}

interface DatabaseReplyResponse {
  id: string;
  content: string;
  message_type: 'text' | 'audio' | 'system';
  created_at: string;
  user_id: string;
  user: DatabaseUser | null;
}

export function ThreadPanel({ roomId, isOpen, onClose, currentUser, thread, onReplyAdded }: ThreadPanelProps) {
  const [replies, setReplies] = useState<Thread[]>([]);
  const [replyText, setReplyText] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (thread) {
      loadThreadReplies(thread.id);
    }
  }, [thread]);

  const loadThreadReplies = async (threadId: string) => {
    try {
      const { data: replyData, error: replyError } = await supabase
        .from('messages')
        .select(`
          *,
          user:user_id (
            id,
            email,
            full_name
          )
        `)
        .eq('thread_parent_id', threadId)
        .order('created_at', { ascending: true });

      if (replyError) {
        console.error('Error loading replies:', replyError);
        return;
      }

      if (!replyData) {
        setReplies([]);
        return;
      }

      // Transform the data to match our Thread interface
      const repliesWithUsers: Thread[] = replyData.map(reply => ({
        id: reply.id,
        content: reply.content,
        message_type: reply.message_type as 'text' | 'audio' | 'system',
        created_at: reply.created_at,
        user: reply.user || {
          id: reply.user_id,
          email: 'Unknown User',
          full_name: 'Unknown User'
        }
      }));

      setReplies(repliesWithUsers);
    } catch (error) {
      console.error('Error in loadThreadReplies:', error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !thread) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: currentUser.id,
          content: replyText.trim(),
          message_type: 'text',
          thread_parent_id: thread.id
        });

      if (error) {
        console.error('Error sending reply:', error);
        return;
      }

      setReplyText('');
      onReplyAdded?.();
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Subscribe to new replies
  useEffect(() => {
    if (!thread) return;

    const channel = supabase
      .channel(`thread-${thread.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `thread_parent_id=eq.${thread.id}`
        }, 
        (payload) => {
          const newReply = payload.new as DatabaseMessage;
          
          // If it's the current user's reply, we can use their data directly
          if (newReply.user_id === currentUser.id) {
            const completeReply: Thread = {
              id: newReply.id,
              content: newReply.content,
              message_type: newReply.message_type,
              created_at: newReply.created_at,
              user: {
                id: currentUser.id,
                email: currentUser.email,
                full_name: currentUser.user_metadata.full_name
              }
            };
            setReplies(prev => [...prev, completeReply]);
            // Trigger count update for other users' replies too
            onReplyAdded?.();
          } else {
            // For other users' replies, use a temporary display
            const completeReply: Thread = {
              id: newReply.id,
              content: newReply.content,
              message_type: newReply.message_type,
              created_at: newReply.created_at,
              user: {
                id: newReply.user_id,
                email: 'Loading...',
                full_name: 'Loading...'
              }
            };
            setReplies(prev => [...prev, completeReply]);
            // Trigger count update for other users' replies
            onReplyAdded?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread, currentUser]);

  if (!isOpen || !thread) return null;

  return (
    <div className="w-[400px] flex flex-col border-l border-[#1E2538] bg-[#0A0F1C]">
      <header className="flex items-center justify-between p-4 border-b border-[#1E2538]">
        <h2 className="text-lg font-semibold text-white">Thread</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Original Message */}
        <div className="pb-4 mb-4 border-b border-[#1E2538]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2A2F3F]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">
                  {thread.user.full_name || thread.user.email}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(thread.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="mt-1 p-3 bg-[#1E2433] rounded-lg text-gray-300">
                {detectAndRenderUrls(thread.content)}
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4">
          {replies.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">
              No replies yet
            </div>
          ) : (
            replies.map(reply => (
              <div key={reply.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2A2F3F]" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {reply.user.full_name || reply.user.email}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(reply.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="mt-1 p-3 bg-[#1E2433] rounded-lg text-gray-300">
                    {detectAndRenderUrls(reply.content)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t border-[#1E2538]">
        <div className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Reply in thread..."
            className="flex-1 px-4 py-2 bg-[#1E2433] rounded-lg text-white placeholder-gray-400 border-none outline-none min-w-0"
          />
          <Button
            onClick={handleSendReply}
            disabled={!replyText.trim()}
            variant="default"
            size="default"
            className="bg-[#4477FF] hover:bg-[#3366EE] text-white"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
} 