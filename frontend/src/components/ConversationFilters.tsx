import { useState, useEffect } from 'react';
import { ConversationFilters } from '../services/api';
import { useFilterOptions } from '../hooks/useConversations';

interface ConversationFiltersProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
}

export const ConversationFiltersComponent = ({ filters, onFiltersChange }: ConversationFiltersProps) => {
  const { data: filterOptionsData, isLoading } = useFilterOptions();
  const [localFilters, setLocalFilters] = useState<ConversationFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const filterOptions = filterOptionsData?.data;

  // Sync local filters when props change (when filters are applied externally)
  useEffect(() => {
    const filtersString = JSON.stringify(filters);
    const localFiltersString = JSON.stringify(localFilters);
    if (filtersString !== localFiltersString) {
      setLocalFilters(filters);
      setHasPendingChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Check if local filters differ from applied filters
  useEffect(() => {
    const filtersString = JSON.stringify(filters);
    const localFiltersString = JSON.stringify(localFilters);
    setHasPendingChanges(filtersString !== localFiltersString);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilters]);

  const updateFilter = (key: keyof ConversationFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    // Don't apply immediately - wait for Apply button
  };

  const toggleArrayFilter = (key: 'csat' | 'intent' | 'channel', value: any) => {
    const current = localFilters[key] || [];
    const array = Array.isArray(current) ? current : [current];
    const newArray = array.includes(value)
      ? array.filter((v: any) => v !== value)
      : [...array, value];
    const newFilters = { ...localFilters, [key]: newArray.length > 0 ? newArray : undefined };
    setLocalFilters(newFilters);
    // Don't apply immediately - wait for Apply button
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setHasPendingChanges(false);
  };

  const clearFilters = () => {
    const cleared: ConversationFilters = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
    setHasPendingChanges(false);
  };

  const hasActiveFilters = Object.keys(localFilters).length > 0;

  if (isLoading) {
    return <div className="bg-white p-4 rounded-lg border border-gray-200">Loading filters...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasPendingChanges && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              Pending Changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              Clear All
            </button>
          )}
          {hasPendingChanges && (
            <button
              onClick={applyFilters}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Apply Filters
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${isExpanded ? '' : 'hidden'}`}>
        {/* CSAT Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CSAT</label>
          <div className="space-y-2">
            {filterOptions?.csatOptions.map((option) => (
              <label key={option.value === null ? 'null' : option.value || 'null'} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(localFilters.csat || []).includes(option.value as 'good' | 'bad' | null)}
                  onChange={() => toggleArrayFilter('csat', option.value as 'good' | 'bad' | null)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Channel Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
          <div className="space-y-2">
            {filterOptions?.channelOptions.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(localFilters.channel || []).includes(option.value as any)}
                  onChange={() => toggleArrayFilter('channel', option.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Intent Filter */}
        {filterOptions?.intentOptions && filterOptions.intentOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Intent</label>
            <select
              multiple
              value={localFilters.intent || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                updateFilter('intent', selected.length > 0 ? selected : undefined);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              size={5}
            >
              {filterOptions.intentOptions.map((intent) => (
                <option key={intent} value={intent}>
                  {intent}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Human Handover Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Human Handover</label>
          <select
            value={localFilters.humanHandover === undefined ? '' : localFilters.humanHandover.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : e.target.value === 'true';
              updateFilter('humanHandover', value);
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        {/* Lead Created Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lead Created</label>
          <select
            value={
              localFilters.leadCreated === undefined 
                ? '' 
                : localFilters.leadCreated === null 
                  ? 'null' 
                  : localFilters.leadCreated.toString()
            }
            onChange={(e) => {
              let value: boolean | null | undefined;
              if (e.target.value === '') {
                value = undefined;
              } else if (e.target.value === 'null') {
                value = null;
              } else {
                value = e.target.value === 'true';
              }
              updateFilter('leadCreated', value);
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All</option>
            <option value="true">Lead Created</option>
            <option value="false">Lead Not Created</option>
            <option value="null">No Lead Data</option>
          </select>
        </div>

        {/* Date Range Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
          <input
            type="date"
            value={localFilters.dateFrom || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
          <input
            type="date"
            value={localFilters.dateTo || ''}
            onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {hasActiveFilters && !isExpanded && (
        <div className="mt-4 flex flex-wrap gap-2">
          {localFilters.csat && localFilters.csat.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              CSAT: {localFilters.csat.length} selected
            </span>
          )}
          {localFilters.channel && localFilters.channel.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              Channel: {localFilters.channel.length} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
};
