import { ConversationFilters } from '../services/api';

interface QuickFilterChipsProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
}

export const QuickFilterChips = ({ filters, onFiltersChange }: QuickFilterChipsProps) => {
  const handleQuickFilter = (filterType: string) => {
    let newFilters = { ...filters };

    switch (filterType) {
      case 'unassessed':
        newFilters = { ...newFilters, csat: [null] };
        break;
      case 'needs_review':
        newFilters = { ...newFilters, csat: ['bad'] };
        break;
      case 'clear':
        newFilters = {};
        break;
      default:
        return;
    }

    onFiltersChange(newFilters);
  };

  const isActive = (filterType: string) => {
    switch (filterType) {
      case 'unassessed':
        return filters.csat?.includes(null) && (!filters.csat || filters.csat.length === 1);
      case 'needs_review':
        return filters.csat?.includes('bad') && (!filters.csat || filters.csat.length === 1);
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
      description: 'Bad rating',
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
