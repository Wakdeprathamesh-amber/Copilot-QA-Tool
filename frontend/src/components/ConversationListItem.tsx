import { useState } from 'react';
import { Conversation, QAAssessment } from '../services/api';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { api } from '../services/api';

interface ConversationListItemProps {
  conversation: Conversation;
  qaAssessment?: QAAssessment | null;
  onClick: () => void;
  onRatingChange?: (conversationId: string, rating: 'good' | 'okay' | 'bad') => void;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export const ConversationListItem = ({ conversation, qaAssessment, onClick, onRatingChange, isSelected = false, onToggleSelection }: ConversationListItemProps) => {
  // Compute QA status from prop instead of fetching
  const qaStatus = qaAssessment ? {
    rating: qaAssessment.rating,
    tags: qaAssessment.tags || [],
    hasNotes: !!qaAssessment.notes,
  } : null;
  
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently fail - clipboard access may be restricted
    }
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(conversation.id);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/conversations/${conversation.id}`;
    copyToClipboard(link);
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/conversations/${conversation.id}`, '_blank');
  };

  const handleQuickRating = async (e: React.MouseEvent, rating: 'good' | 'okay' | 'bad') => {
    e.stopPropagation();
    try {
      await api.qaAssessments.setRating(conversation.id, rating);
      setShowRatingMenu(false);
      // Notify parent to refresh - parent will refetch QA assessments in bulk
      if (onRatingChange) {
        onRatingChange(conversation.id, rating);
      }
    } catch (error) {
      // Error handling - could show toast notification in future
    }
  };
  const getCSATBadge = () => {
    if (conversation.csat === 'good') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Good CSAT</span>;
    }
    if (conversation.csat === 'bad') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Bad CSAT</span>;
    }
    return null;
  };

  const getStudentCSATBadge = () => {
    if (!conversation.studentCsat) return null;
    if (conversation.studentCsat === 'positive') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
          Student Positive
        </span>
      );
    }
    if (conversation.studentCsat === 'negative') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
          Student Negative
        </span>
      );
    }
    // no_feedback
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
        No Student Feedback
      </span>
    );
  };

  const getChannelBadge = () => {
    const channelLabel = conversation.channel === 'whatsapp' ? 'WhatsApp' : 'Website';
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        conversation.channel === 'whatsapp' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-blue-100 text-blue-800'
      }`}>
        {channelLabel}
      </span>
    );
  };

  const getInteractionTypeBadge = () => {
    const config = {
      ai_only: { label: 'AI Only', className: 'bg-blue-100 text-blue-800' },
      human_only: { label: 'Human Only', className: 'bg-purple-100 text-purple-800' },
      ai_to_human_handover: { label: 'AI → Human', className: 'bg-orange-100 text-orange-800' },
      mixed: { label: 'Mixed', className: 'bg-gray-100 text-gray-800' },
    };

    const configItem = config[conversation.interactionType] || config.ai_only;
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${configItem.className}`}>
        {configItem.label}
      </span>
    );
  };

  const getOutcomeBadge = () => {
    const config = {
      qualified: { label: 'Qualified', className: 'bg-green-100 text-green-800' },
      dropped: { label: 'Dropped', className: 'bg-red-100 text-red-800' },
      escalated: { label: 'Escalated', className: 'bg-orange-100 text-orange-800' },
      ongoing: { label: 'Ongoing', className: 'bg-blue-100 text-blue-800' },
    };

    const configItem = config[conversation.outcome];
    if (!configItem) return null;
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${configItem.className}`}>
        {configItem.label}
      </span>
    );
  };

  const getLeadCreatedBadge = () => {
    if (conversation.leadCreated === true) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
          ✓ Lead Created
        </span>
      );
    }
    return null;
  };

  const getQARatingBadge = () => {
    if (!qaStatus?.rating) return null;
    const colors = {
      good: 'bg-green-100 text-green-800',
      okay: 'bg-yellow-100 text-yellow-800',
      bad: 'bg-red-100 text-red-800',
    };
    const icons = {
      good: '✓',
      okay: '⚠',
      bad: '✗',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[qaStatus.rating]}`}>
        {icons[qaStatus.rating]} {qaStatus.rating.charAt(0).toUpperCase() + qaStatus.rating.slice(1)}
      </span>
    );
  };

  const getQATagsPreview = () => {
    if (!qaStatus?.tags || qaStatus.tags.length === 0) return null;
    const displayTags = qaStatus.tags.slice(0, 3);
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {displayTags.map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
          >
            {tag}
          </span>
        ))}
        {qaStatus.tags.length > 3 && (
          <span className="text-xs text-gray-500">+{qaStatus.tags.length - 3}</span>
        )}
      </div>
    );
  };

  const getDuration = () => {
    if (!conversation.endTime) return null;
    const start = new Date(conversation.startTime);
    const end = new Date(conversation.endTime);
    const minutes = differenceInMinutes(end, start);
    const seconds = differenceInSeconds(end, start) % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getMessageCount = () => {
    if (conversation.messageCount !== undefined) {
      return conversation.messageCount;
    }
    return null;
  };


  return (
    <div
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer relative group ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={onClick}
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => {
        setShowQuickActions(false);
        setShowRatingMenu(false);
      }}
    >
      <div className="flex items-start justify-between mb-2">
        {/* Checkbox for selection */}
        {onToggleSelection && (
          <div className="mr-3 pt-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Conversation ID Row */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 group/id">
              <span className="text-xs text-gray-500 font-mono">{conversation.id}</span>
              <button
                onClick={handleCopyId}
                className="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                title="Copy ID"
              >
                <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              {copied && (
                <span className="text-xs text-green-600">Copied!</span>
              )}
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getChannelBadge()}
            {getInteractionTypeBadge()}
            {getOutcomeBadge()}
            {getLeadCreatedBadge()}
            {getCSATBadge()}
            {getStudentCSATBadge()}
            {getQARatingBadge()}
            {qaStatus?.hasNotes && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                📝 Has Notes
              </span>
            )}
          </div>

          {/* Summary */}
          {conversation.autoSummary && (
            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
              {conversation.autoSummary}
            </p>
          )}

          {/* Tags Preview */}
          {getQATagsPreview() && (
            <div className="mb-2">
              {getQATagsPreview()}
            </div>
          )}
          
          {/* Enhanced Metadata Row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            {conversation.detectedIntent && (
              <span>Conversation intent: <span className="font-medium">{conversation.detectedIntent}</span></span>
            )}
            {conversation.needsHuman !== undefined && conversation.needsHuman !== null && (
              <span>Needs human: <span className="font-medium">{conversation.needsHuman ? 'Yes' : 'No'}</span></span>
            )}
            
            {/* Message Count */}
            {getMessageCount() !== null && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-medium">{getMessageCount()}</span> messages
              </span>
            )}
            
            {/* Duration */}
            {getDuration() && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{getDuration()}</span>
              </span>
            )}
            
            {/* Start Time */}
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(new Date(conversation.startTime), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        {showQuickActions && (
          <div className="flex items-center gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRatingMenu(!showRatingMenu);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Set Rating"
              >
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
              {showRatingMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={(e) => handleQuickRating(e, 'good')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-green-700 rounded-t-lg"
                  >
                    ✓ Good
                  </button>
                  <button
                    onClick={(e) => handleQuickRating(e, 'okay')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-yellow-50 text-yellow-700"
                  >
                    ⚠ Okay
                  </button>
                  <button
                    onClick={(e) => handleQuickRating(e, 'bad')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-700 rounded-b-lg"
                  >
                    ✗ Bad
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleCopyLink}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy Link"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button
              onClick={handleOpenNewTab}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in New Tab"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
