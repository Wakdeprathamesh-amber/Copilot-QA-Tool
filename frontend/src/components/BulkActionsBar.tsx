import React, { useState } from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkTag: (tag: string) => void;
  onBulkRating: (rating: 'good' | 'okay' | 'bad') => void;
  onExport: () => void;
  onMarkForReview: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkTag,
  onBulkRating,
  onExport,
  onMarkForReview,
}) => {
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkRating = (rating: 'good' | 'okay' | 'bad') => {
    setShowRatingMenu(false);
    onBulkRating(rating);
  };

  const handleTagSubmit = () => {
    if (tagInput.trim()) {
      onBulkTag(tagInput.trim());
      setTagInput('');
      setShowTagInput(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {selectedCount} of {totalCount} selected
            </span>
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Select all on page
              </button>
            )}
            {selectedCount > 0 && (
              <button
                onClick={onDeselectAll}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk Rating */}
          <div className="relative">
            <button
              onClick={() => setShowRatingMenu(!showRatingMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Set Rating
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showRatingMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowRatingMenu(false)}
                />
                <div className="absolute left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <button
                    onClick={() => handleBulkRating('good')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-green-700 rounded-t-lg"
                  >
                    ✓ Good
                  </button>
                  <button
                    onClick={() => handleBulkRating('okay')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-yellow-50 text-yellow-700"
                  >
                    ⚠ Okay
                  </button>
                  <button
                    onClick={() => handleBulkRating('bad')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-700 rounded-b-lg"
                  >
                    ✗ Bad
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bulk Tag */}
          <button
            onClick={() => setShowTagInput(!showTagInput)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Add Tag
          </button>

          {/* Mark for Review */}
          <button
            onClick={onMarkForReview}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mark for Review
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export ({selectedCount})
          </button>
        </div>
      </div>

      {/* Tag Input */}
      {showTagInput && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Enter tag name..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTagSubmit();
                }
              }}
            />
            <button
              onClick={handleTagSubmit}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add
            </button>
            <button
              onClick={() => {
                setTagInput('');
                setShowTagInput(false);
              }}
              className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
