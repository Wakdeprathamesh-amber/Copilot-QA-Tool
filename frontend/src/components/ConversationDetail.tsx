import { useParams, useNavigate } from 'react-router-dom';
import { useConversation } from '../hooks/useConversations';
import { MessageBubble } from './MessageBubble';
import { QAToolsPanel } from './QAToolsPanel';
import { format } from 'date-fns';

export const ConversationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useConversation(id || '', true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading conversation</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Explorer
          </button>
        </div>
      </div>
    );
  }

  const conversation = data.data;
  const messages = conversation.messages || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/')}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Explorer
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Conversation Details</h1>
            </div>
            <div className="text-sm text-gray-600">
              {format(new Date(conversation.startTime), 'PPpp')}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Panel - Left Side (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="mb-4 pb-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Conversation</h2>
                {(conversation.salesiqConversationUrl || conversation.leadUrl || conversation.zohoDeskTicketUrl) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {conversation.salesiqConversationUrl && (
                      <a
                        href={conversation.salesiqConversationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                      >
                        SalesIQ →
                      </a>
                    )}
                    {conversation.leadUrl && (
                      <a
                        href={conversation.leadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                      >
                        CRM Lead →
                      </a>
                    )}
                    {conversation.zohoDeskTicketUrl && (
                      <a
                        href={conversation.zohoDeskTicketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
                      >
                        Zoho Desk →
                      </a>
                    )}
                  </div>
                )}
                {conversation.autoSummary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">Summary:</span> {conversation.autoSummary}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages in this conversation</p>
                ) : (
                  messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* QA Tools Panel - Right Side (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <QAToolsPanel conversation={conversation} />
          </div>
        </div>
      </div>
    </div>
  );
};
