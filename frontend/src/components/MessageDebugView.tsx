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

  return (
    <div className="mt-2 pt-2 border-t border-gray-200">
      {langsmithUrl ? (
        <a
          href={langsmithUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 transition-colors"
          title="View trace in LangSmith (opens in new tab)"
        >
          <span className="text-gray-500">Trace ID:</span>
          <span className="font-mono">{message.langsmithTraceId.substring(0, 8)}...</span>
          <span className="text-blue-600">↗</span>
        </a>
      ) : (
        <span
          className="text-xs text-gray-400 inline-flex items-center gap-1"
          title="Loading LangSmith URL..."
        >
          <span className="text-gray-500">Trace ID:</span>
          <span className="font-mono">{message.langsmithTraceId.substring(0, 8)}...</span>
          <span className="animate-pulse">…</span>
        </span>
      )}
    </div>
  );
};
