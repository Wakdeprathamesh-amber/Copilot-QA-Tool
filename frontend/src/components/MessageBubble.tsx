import { Message } from '../services/api';
import { format } from 'date-fns';
import { MessageDebugView } from './MessageDebugView';
import { parseMessageContent } from '../utils/messageContent';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';
  const isHuman = message.sender === 'human';

  const parsed = parseMessageContent(message.content);

  const getBubbleStyles = () => {
    if (isUser) {
      return 'bg-blue-500 text-white ml-auto';
    }
    if (isAI) {
      return 'bg-gray-100 text-gray-900';
    }
    if (isHuman) {
      return 'bg-green-100 text-green-900';
    }
    return 'bg-gray-100 text-gray-900';
  };

  const getSenderLabel = () => {
    if (isUser) return 'You';
    if (isAI) return 'AI Assistant';
    if (isHuman) {
      // Show operator name if available, otherwise default label
      return message.operatorName ? message.operatorName : 'Human Agent';
    }
    return 'System';
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getBubbleStyles()}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold opacity-75">{getSenderLabel()}</span>
          <span className="text-xs opacity-60">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap break-words message-content">
          {parsed.kind === 'html' ? (
            <div dangerouslySetInnerHTML={{ __html: parsed.value }} />
          ) : (
            parsed.value
          )}
        </div>
        {message.intent && (
          <div className="text-xs opacity-75 mt-1 italic">
            Intent: {Array.isArray(message.intent) ? message.intent.join(', ') : message.intent}
          </div>
        )}
        {/* Only show latency if available - not showing null/undefined values */}
        {message.processingLatency !== null && message.processingLatency !== undefined && (
          <div className="text-xs opacity-60 mt-1">
            Latency: {message.processingLatency}ms
          </div>
        )}
      </div>
      {/* Debug view for AI messages */}
      {message.sender === 'ai' && <MessageDebugView message={message} />}
    </div>
  );
};
