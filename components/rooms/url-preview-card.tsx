import { ExternalLink } from 'lucide-react';

interface UrlPreviewCardProps {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  status: 'pending' | 'scraped' | 'failed';
}

export function UrlPreviewCard({ url, title, description, imageUrl, status }: UrlPreviewCardProps) {
  // Extract domain from URL for display
  const domain = new URL(url).hostname.replace('www.', '');

  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block border border-[#2A2F3F] rounded-lg overflow-hidden hover:border-[#4477FF] transition-colors"
    >
      <div className="flex gap-4 p-3 bg-[#1E2433]">
        {/* Left side: Image or fallback */}
        {imageUrl ? (
          <div className="w-[120px] h-[80px] flex-shrink-0">
            <img 
              src={imageUrl} 
              alt={title || 'Link preview'} 
              className="w-full h-full object-cover rounded"
            />
          </div>
        ) : (
          <div className="w-[120px] h-[80px] bg-[#2A2F3F] rounded flex items-center justify-center flex-shrink-0">
            <ExternalLink size={24} className="text-gray-400" />
          </div>
        )}

        {/* Right side: Text content */}
        <div className="flex-1 min-w-0">
          {/* Status indicator */}
          {status === 'pending' && (
            <div className="text-xs text-gray-400 mb-1">Loading preview...</div>
          )}
          {status === 'failed' && (
            <div className="text-xs text-red-400 mb-1">Preview unavailable</div>
          )}
          
          {/* Title */}
          <h3 className="font-medium text-white truncate">
            {title || url}
          </h3>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-gray-300 mt-1 line-clamp-2">
              {description}
            </p>
          )}
          
          {/* Domain */}
          <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <ExternalLink size={12} />
            {domain}
          </div>
        </div>
      </div>
    </a>
  );
} 