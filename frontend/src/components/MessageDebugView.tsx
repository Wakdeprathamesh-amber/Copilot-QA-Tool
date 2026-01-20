import { Message } from '../services/api';
import { api } from '../services/api';
import { useState, useEffect } from 'react';

interface MessageDebugViewProps {
  message: Message;
}

export const MessageDebugView = ({ message }: MessageDebugViewProps) => {
  const [langsmithUrl, setLangsmithUrl] = useState<string | null>(null);

  // Load LangSmith URL when component mounts if trace ID exists
  useEffect(() => {
    if (message.langsmithTraceId) {
      const loadLangSmithUrl = async () => {
        try {
          const info = await api.messages.getDebugInfo(message.id);
          if (info.langsmithUrl) {
            setLangsmithUrl(info.langsmithUrl);
          }
        } catch (error) {
          // Failed to load LangSmith URL - trace may not be available
        }
      };
      loadLangSmithUrl();
    }
  }, [message.id, message.langsmithTraceId]);

  // Only show if trace ID exists
  if (!message.langsmithTraceId) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (langsmithUrl) {
      window.open(langsmithUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-gray-200">
      <button
        onClick={handleClick}
        disabled={!langsmithUrl}
        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={langsmithUrl ? 'View trace in LangSmith' : 'Loading LangSmith URL...'}
      >
        <span className="text-gray-500">Trace ID:</span>
        <span className="font-mono">{message.langsmithTraceId.substring(0, 8)}...</span>
        <span className="text-blue-600">↗</span>
      </button>
    </div>
  );
};
