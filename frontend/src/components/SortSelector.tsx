import { useState } from 'react';

// Backend only supports newest and oldest; other sorts are not implemented
export type SortOption = 'newest' | 'oldest';

export interface SortOptionConfig {
  value: SortOption;
  label: string;
  icon?: string;
}

const sortOptions: SortOptionConfig[] = [
  { value: 'newest', label: 'Newest First', icon: '⬇️' },
  { value: 'oldest', label: 'Oldest First', icon: '⬆️' },
];

interface SortSelectorProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

export const SortSelector = ({ value, onChange }: SortSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = sortOptions.find(opt => opt.value === value) || sortOptions[0];

  // Save sort preference to localStorage
  const handleSortChange = (newSort: SortOption) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('conversationSort', newSort);
      }
    } catch (error) {
      // Failed to save sort preference - continue without saving
      // Failed to save sort preference - continue without saving
    }
    onChange(newSort);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        <span className="text-gray-600">Sort:</span>
        <span className="font-medium text-gray-900">
          {selectedOption.icon && <span className="mr-1">{selectedOption.icon}</span>}
          {selectedOption.label}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  value === option.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {option.icon && <span>{option.icon}</span>}
                  <span>{option.label}</span>
                  {value === option.value && (
                    <svg className="ml-auto h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
