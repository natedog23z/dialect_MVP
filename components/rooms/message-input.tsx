'use client';

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Mic } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { createClient } from '@/utils/supabase/client';

interface MessageInputProps {
  roomId: string;
  userId: string;
}

// URL regex pattern
const URL_PATTERN = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

export function MessageInput({ roomId, userId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const supabase = createClient();

  useEffect(() => {
    if (message && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(false);
      }
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message]);

  const updateTypingStatus = async (typing: boolean) => {
    if (typing) {
      await supabase
        .from('typing_status')
        .upsert({ 
          room_id: roomId,
          user_id: userId,
          last_typed: new Date().toISOString()
        });
    } else {
      await supabase
        .from('typing_status')
        .delete()
        .match({ 
          room_id: roomId,
          user_id: userId
        });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      // Check if the message contains a URL
      const containsUrl = URL_PATTERN.test(message.trim());
      const messageType = containsUrl ? 'url' : 'text';

      console.log('Attempting to send message:', {
        room_id: roomId,
        user_id: userId,
        content: message.trim(),
        message_type: messageType
      });

      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: userId,
          content: message.trim(),
          message_type: messageType
        })
        .select();

      if (error) {
        console.error('Detailed error sending message:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Message sent successfully:', data);

      // If it's a URL message, trigger scraping immediately
      if (messageType === 'url' && data?.[0]?.id) {
        try {
          const response = await fetch(`/api/scrape?${new URLSearchParams({
            messageId: data[0].id.toString()
          })}`);

          if (!response.ok) {
            console.error('Error scraping URL:', await response.text());
          }
        } catch (error) {
          console.error('Error triggering URL scrape:', error);
        }
      }

      setMessage('');
    } catch (err: any) {
      console.error('Caught error sending message:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement audio recording logic
  };

  return (
    <div className="p-4 border-t border-[#1E2538]">
      <div className="flex items-center gap-2 bg-[#1E2433] rounded-lg p-2">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-gray-400 hover:text-white"
        >
          <Paperclip size={20} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={`text-gray-400 hover:text-white ${isRecording ? 'text-red-500' : ''}`}
          onClick={toggleRecording}
        >
          <Mic size={20} />
        </Button>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Send message"
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
        />

        <Button
          variant="ghost"
          size="icon"
          className="bg-[#4477FF] hover:bg-[#3366EE] text-white"
          onClick={handleSendMessage}
          disabled={!message.trim() && !isRecording}
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
} 