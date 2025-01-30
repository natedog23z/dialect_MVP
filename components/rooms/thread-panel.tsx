'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { createClient } from '@/utils/supabase/client';

interface Thread {
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
  replies?: Thread[];
}

interface ThreadPanelProps {
  roomId: string;
}

export function ThreadPanel({ roomId }: ThreadPanelProps) {
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Thread[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (activeThread) {
      loadThreadReplies(activeThread.id);
    }
  }, [activeThread]);

  const loadThreadReplies = async (threadId: string) => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
        *,
          user:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('thread_parent_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
      console.error('Error loading replies:', error);
        return;
      }

    setReplies(data || []);
  };

  // Subscribe to new replies
  useEffect(() => {
    if (!activeThread) return;

    const channel = supabase
      .channel(`thread-${activeThread.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `thread_parent_id=eq.${activeThread.id}`
        }, 
        (payload) => {
          setReplies(prev => [...prev, payload.new as Thread]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThread]);

  if (!activeThread) return null;

  return (
    <div className="w-[400px] flex flex-col border-l border-[#1E2538] bg-[#0A0F1C]">
      <header className="flex items-center justify-between p-4 border-b border-[#1E2538]">
        <h2 className="text-lg font-semibold text-white">Thread</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white"
          onClick={() => setActiveThread(null)}
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
                  {activeThread.user.raw_user_meta_data?.full_name || activeThread.user.email}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(activeThread.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="mt-1 p-3 bg-[#1E2433] rounded-lg text-gray-300">
                {activeThread.content}
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
            replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2A2F3F]" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {reply.user.raw_user_meta_data?.full_name || reply.user.email}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(reply.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="mt-1 p-3 bg-[#1E2433] rounded-lg text-gray-300">
                    {reply.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t border-[#1E2538]">
          <input
            type="text"
            placeholder="Reply in thread..."
          className="w-full px-4 py-2 bg-[#1E2433] rounded-lg text-white placeholder-gray-400 border-none outline-none"
          />
      </div>
    </div>
  );
} 