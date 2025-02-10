import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SystemStatusMessageProps {
  content: string;
  created_at: string;
  isProcessing?: boolean;
}

export function SystemStatusMessage({ content, created_at, isProcessing = true }: SystemStatusMessageProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isProcessing]);

  return (
    <div className="flex items-start gap-3 p-4">
      {/* System avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-medium">
        S
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-400">System Status</span>
          <span className="text-sm text-gray-500">
            {new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="mt-1 p-3 bg-[#1E2433] rounded-lg">
          <div className="flex items-center gap-2 text-gray-400 italic">
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {content}
              <span className="inline-block w-6">{isProcessing ? dots : ''}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 