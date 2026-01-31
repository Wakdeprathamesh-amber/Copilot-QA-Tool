import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient, useQuery } from 'react-query';
import { useConversations } from '../hooks/useConversations';
import { ConversationFilters, ConversationListResponse } from '../services/api';
import { ConversationListItem } from './ConversationListItem';
import { api } from '../services/api';
import { ConversationFiltersComponent } from './ConversationFilters';
import { SearchBar } from './SearchBar';
import { SortSelector, SortOption } from './SortSelector';
import { BulkActionsBar } from './BulkActionsBar';
import { QuickFilterChips } from './QuickFilterChips';
// import { EnhancedResultsSummary } from './EnhancedResultsSummary';

export const ConversationExplorer = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('conversationSort');
        if (saved && ['newest', 'oldest', 'most_messages', 'least_messages', 'longest_duration', 'shortest_duration', 'highest_csat', 'lowest_csat', 'recently_assessed', 'unassessed_first'].includes(saved)) {
          return saved as SortOption;
        }
      }
    } catch (error) {
      // Failed to load sort preference - use default
    }
    return 'newest';
  });
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Sync search query with URL
  useEffect(() => {
    if (searchQuery) {
      searchParams.set('search', searchQuery);
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchQuery, searchParams, setSearchParams]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
    setSelectedConversations(new Set());
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useConversations(filters, page, pageSize, searchQuery, sortBy);
  
  // Type guard for conversations data - explicitly type the response
  const conversationsData = data?.data as ConversationListResponse['data'] | undefined;

  // Fetch QA assessments in bulk for all conversations
  const { data: qaAssessmentsData } = useQuery(
    ['qaAssessments', conversationsData?.conversations.map(c => c.id).sort().join(',')],
    async () => {
      if (!conversationsData?.conversations.length) return {};
      
      const conversationIds = conversationsData.conversations.map(c => c.id);
      const response = await api.qaAssessments.getBulk(conversationIds);
      return response.data || {};
    },
    {
      enabled: !!conversationsData?.conversations.length,
      staleTime: 30000, // 30 seconds
    }
  );

  const handleConversationClick = (conversationId: string) => {
    navigate(`/conversations/${conversationId}`);
  };

  const handleFiltersChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  // Handle selection
  const handleToggleSelection = (conversationId: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (conversationsData?.conversations) {
      const allIds = new Set(conversationsData.conversations.map(c => c.id));
      setSelectedConversations(allIds);
    }
  };

  const handleDeselectAll = () => {
    setSelectedConversations(new Set());
  };

  // Export functionality
  const handleExport = () => {
    const conversationsToExport = conversationsData?.conversations.filter(c => 
      selectedConversations.size > 0 ? selectedConversations.has(c.id) : true
    ) || [];

    // Convert to CSV
    const headers = ['ID', 'Channel', 'Start Time', 'End Time', 'CSAT', 'Outcome', 'Intent', 'Message Count', 'Duration'];
    const rows = conversationsToExport.map(c => {
      const duration = c.endTime 
        ? `${Math.round((new Date(c.endTime).getTime() - new Date(c.startTime).getTime()) / 60000)}m`
        : '';
      return [
        c.id,
        c.channel,
        c.startTime,
        c.endTime || '',
        c.csat || '',
        c.outcome,
        c.detectedIntent || '',
        c.messageCount || 0,
        duration,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversations_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk actions
  const handleBulkTag = async (tag: string) => {
    if (!tag.trim() || selectedConversations.size === 0) return;
    
    try {
      const conversationIds = Array.from(selectedConversations);
      await api.qaAssessments.addBulkTags(conversationIds, [tag.trim()]);
      
      // Invalidate QA assessments query to refresh data
      queryClient.invalidateQueries(['qaAssessments']);
      
      // Clear selection after successful tag
      setSelectedConversations(new Set());
    } catch (error) {
      // Error handling - could show toast notification in future
    }
  };

  const handleBulkRating = async (rating: 'good' | 'okay' | 'bad') => {
    if (selectedConversations.size === 0) return;
    
    try {
      const conversationIds = Array.from(selectedConversations);
      await api.qaAssessments.setBulkRating(conversationIds, rating);
      
      // Invalidate QA assessments query to refresh data
      queryClient.invalidateQueries(['qaAssessments']);
      
      // Clear selection after successful rating
      setSelectedConversations(new Set());
    } catch (error) {
      // Error handling - could show toast notification in future
    }
  };

  const handleMarkForReview = async () => {
    if (selectedConversations.size === 0) return;
    
    try {
      // Mark for review by adding "needs-review" tag
      const conversationIds = Array.from(selectedConversations);
      await api.qaAssessments.addBulkTags(conversationIds, ['needs-review']);
      
      // Invalidate QA assessments query to refresh data
      queryClient.invalidateQueries(['qaAssessments']);
      
      // Clear selection after successful tag
      setSelectedConversations(new Set());
    } catch (error) {
      // Error handling - could show toast notification in future
    }
  };

  const totalPages = conversationsData ? Math.ceil(conversationsData.total / conversationsData.pageSize) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Conversation Explorer</h1>
              <p className="text-gray-600">Browse and filter AI conversations for quality assessment</p>
            </div>
          </div>

          {/* Search Bar and Sort */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by conversation ID, message content, summary, or intent..."
              />
            </div>
            <SortSelector value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="mb-4">
          <QuickFilterChips filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <ConversationFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* Loading Overlay for Filters */}
        {isLoading && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-800 font-medium">Applying filters and loading conversations...</p>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {conversationsData?.conversations && conversationsData.conversations.length > 0 ? (
          <BulkActionsBar
            selectedCount={selectedConversations.size}
            totalCount={conversationsData.conversations.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkTag={handleBulkTag}
            onBulkRating={handleBulkRating}
            onExport={handleExport}
            onMarkForReview={handleMarkForReview}
          />
        ) : null}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading conversations...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold mb-2">Error loading conversations</p>
            <p className="text-red-600 text-sm mb-2">
              {error.message || 'Failed to connect to backend server'}
            </p>
            <div className="text-red-600 text-sm">
              Please check:
              <ul className="list-disc list-inside mt-1">
                <li>Backend server is running and accessible</li>
                <li>Check browser console for more details</li>
                <li>Verify API URL configuration</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Conversation List */}
        {conversationsData && !isLoading ? (
          <>
            <div className="space-y-4 mb-6">
              {conversationsData.conversations.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  {searchQuery ? (
                    <>
                      <p className="text-gray-600 mb-2">No conversations found matching "{searchQuery}"</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-600">No conversations found matching your filters.</p>
                  )}
                </div>
              ) : (
                conversationsData.conversations.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    qaAssessment={qaAssessmentsData?.[conversation.id]}
                    onClick={() => handleConversationClick(conversation.id)}
                    onRatingChange={() => {
                      // Invalidate queries to refresh QA status
                      queryClient.invalidateQueries(['conversations']);
                      queryClient.invalidateQueries(['qaAssessments']);
                    }}
                    isSelected={selectedConversations.has(conversation.id)}
                    onToggleSelection={() => handleToggleSelection(conversation.id)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{page}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
