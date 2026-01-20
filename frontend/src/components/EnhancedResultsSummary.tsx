import React from 'react';
import { Conversation } from '../services/api';

interface EnhancedResultsSummaryProps {
  conversations: Conversation[];
  total: number;
  filteredCount: number;
  selectedCount: number;
  isFetching: boolean;
  onExport: () => void;
}

export const EnhancedResultsSummary: React.FC<EnhancedResultsSummaryProps> = ({
  conversations,
  total,
  filteredCount,
  selectedCount,
  isFetching,
  onExport,
}) => {
  // Calculate statistics
  const calculateStats = () => {
    const stats = {
      totalConversations: total || 0,
      filteredConversations: filteredCount || 0,
      selectedConversations: selectedCount || 0,
      byChannel: {
        website: 0,
        whatsapp: 0,
      },
      byOutcome: {
        qualified: 0,
        dropped: 0,
        escalated: 0,
        ongoing: 0,
      },
      byCSAT: {
        good: 0,
        bad: 0,
        none: 0,
      },
      averageCSAT: null as number | null,
      totalMessages: 0,
      averageMessages: 0,
    };

    if (!conversations || conversations.length === 0) {
      return stats;
    }

    conversations.forEach((conv) => {
      if (!conv) return;
      // Channel breakdown
      if (conv.channel === 'website') {
        stats.byChannel.website++;
      } else if (conv.channel === 'whatsapp') {
        stats.byChannel.whatsapp++;
      }

      // Outcome breakdown
      if (conv.outcome in stats.byOutcome) {
        stats.byOutcome[conv.outcome as keyof typeof stats.byOutcome]++;
      }

      // CSAT breakdown
      if (conv.csat === 'good') {
        stats.byCSAT.good++;
      } else if (conv.csat === 'bad') {
        stats.byCSAT.bad++;
      } else {
        stats.byCSAT.none++;
      }

      // Message count
      if (conv.messageCount) {
        stats.totalMessages += conv.messageCount;
      }
    });

    // Calculate averages
    if (conversations.length > 0) {
      const csatCount = stats.byCSAT.good + stats.byCSAT.bad;
      if (csatCount > 0) {
        // Simple average: good = 1, bad = 0
        stats.averageCSAT = (stats.byCSAT.good / csatCount) * 100;
      }
      stats.averageMessages = stats.totalMessages / conversations.length;
    }

    return stats;
  };

  const stats = calculateStats();

  // Get time range
  const getTimeRange = () => {
    if (!conversations || conversations.length === 0) return null;
    
    try {
      const timestamps = conversations
        .filter(c => c && c.startTime)
        .map(c => new Date(c.startTime).getTime())
        .filter(ts => !isNaN(ts));
      
      if (timestamps.length === 0) return null;
      
      const oldest = new Date(Math.min(...timestamps));
      const newest = new Date(Math.max(...timestamps));
      
      return { oldest, newest };
    } catch (error) {
      // Error calculating time range - return null
      return null;
    }
  };

  const timeRange = getTimeRange();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Main Summary */}
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-sm text-gray-600">Showing </span>
            <span className="text-sm font-semibold text-gray-900">{conversations.length}</span>
            <span className="text-sm text-gray-600"> of </span>
            <span className="text-sm font-semibold text-gray-900">{filteredCount}</span>
            <span className="text-sm text-gray-600"> conversations</span>
            {selectedCount > 0 && (
              <span className="ml-2 text-sm text-blue-600 font-medium">
                ({selectedCount} selected)
              </span>
            )}
            {isFetching && (
              <span className="ml-2 text-sm text-blue-600">(updating...)</span>
            )}
          </div>

          {/* Breakdown Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Channel Breakdown */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs">
              <span className="text-gray-600">Channels:</span>
              {stats.byChannel.website > 0 && (
                <span className="text-blue-700 font-medium">{stats.byChannel.website} Website</span>
              )}
              {stats.byChannel.whatsapp > 0 && (
                <span className="text-green-700 font-medium">{stats.byChannel.whatsapp} WhatsApp</span>
              )}
            </div>

            {/* CSAT Breakdown */}
            {(stats.byCSAT.good > 0 || stats.byCSAT.bad > 0) && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs">
                <span className="text-gray-600">CSAT:</span>
                {stats.byCSAT.good > 0 && (
                  <span className="text-green-700 font-medium">{stats.byCSAT.good} Good</span>
                )}
                {stats.byCSAT.bad > 0 && (
                  <span className="text-red-700 font-medium">{stats.byCSAT.bad} Bad</span>
                )}
                {stats.averageCSAT !== null && (
                  <span className="text-gray-700 font-medium">
                    ({stats.averageCSAT.toFixed(0)}% avg)
                  </span>
                )}
              </div>
            )}

            {/* Outcome Breakdown */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs">
              <span className="text-gray-600">Outcomes:</span>
              {Object.entries(stats.byOutcome)
                .filter(([_, count]) => count > 0)
                .map(([outcome, count]) => (
                  <span key={outcome} className="text-gray-700 font-medium">
                    {count} {outcome}
                  </span>
                ))}
            </div>

            {/* Average Messages */}
            {stats.averageMessages > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs">
                <span className="text-gray-600">Avg Messages:</span>
                <span className="text-gray-700 font-medium">
                  {stats.averageMessages.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Time Range */}
          {timeRange && (
            <div className="text-xs text-gray-500">
              {timeRange.oldest.toLocaleDateString()} - {timeRange.newest.toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export {filteredCount > 0 ? `(${filteredCount})` : ''}
        </button>
      </div>
    </div>
  );
};
