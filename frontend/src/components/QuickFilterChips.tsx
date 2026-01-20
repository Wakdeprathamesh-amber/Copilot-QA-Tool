import { ConversationFilters } from '../services/api';

interface QuickFilterChipsProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
}

export const QuickFilterChips = ({ filters, onFiltersChange }: QuickFilterChipsProps) => {
  const getDateRange = (range: 'today' | 'week' | 'month') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return { dateFrom: today.toISOString().split('T')[0] };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { dateFrom: weekAgo.toISOString().split('T')[0] };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { dateFrom: monthAgo.toISOString().split('T')[0] };
    }
  };

  const handleQuickFilter = (filterType: string) => {
    let newFilters = { ...filters };

    switch (filterType) {
      case 'unassessed':
        // Filter for conversations without QA rating
        // This would need backend support or client-side filtering
        break;
      case 'needs_review':
        newFilters = {
          ...newFilters,
          csat: ['bad'],
        };
        break;
      case 'today':
      case 'week':
      case 'month':
        const dateRange = getDateRange(filterType as 'today' | 'week' | 'month');
        newFilters = {
          ...newFilters,
          ...dateRange,
        };
        break;
      case 'clear':
        newFilters = {};
        break;
    }

    onFiltersChange(newFilters);
  };

  const isActive = (filterType: string) => {
    switch (filterType) {
      case 'needs_review':
        return filters.csat?.includes('bad');
      case 'today':
      case 'week':
      case 'month':
        return !!filters.dateFrom;
      default:
        return false;
    }
  };

  const quickFilters = [
    {
      id: 'unassessed',
      label: 'Unassessed',
      icon: '❓',
      description: 'No QA rating',
    },
    {
      id: 'needs_review',
      label: 'Needs Review',
      icon: '⚠️',
      description: 'Bad CSAT or Escalated',
    },
    {
      id: 'today',
      label: 'Today',
      icon: '📅',
      description: 'Today\'s conversations',
    },
    {
      id: 'week',
      label: 'This Week',
      icon: '📆',
      description: 'Last 7 days',
    },
    {
      id: 'month',
      label: 'This Month',
      icon: '🗓️',
      description: 'Last 30 days',
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
      {quickFilters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => handleQuickFilter(filter.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isActive(filter.id)
              ? 'bg-blue-100 text-blue-800 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
          title={filter.description}
        >
          <span>{filter.icon}</span>
          <span>{filter.label}</span>
        </button>
      ))}
      {Object.keys(filters).length > 0 && (
        <button
          onClick={() => handleQuickFilter('clear')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 border border-red-300"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear All
        </button>
      )}
    </div>
  );
};
