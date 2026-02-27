import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { api, Conversation } from '../services/api';

interface QAToolsPanelProps {
  conversation: Conversation;
}

export const QAToolsPanel = ({ conversation }: QAToolsPanelProps) => {
  const [rating, setRating] = useState<'good' | 'okay' | 'bad' | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const availableTags = [
    'Small Talk Handling Failure',
    'Intent Not Detected (Small Talk Context)',
    'Missing Information',
    'Incorrect Summary Generation',
    'Intent Misclassification',
    'Intent Not Detected',
    'Handover Failure - Not Triggered',
    'Incorrect Handover Trigger',
    'Entity Extraction Failure - Property',
    'Entity Extraction Failure - Location/Region',
    'Entity Extraction Error - Preferences',
    'Knowledge Gap - Property Information',
    'Incorrect Property Information',
    'Room Type Recognition Failure',
    'No Recommendation Generated',
    'Irrelevant or Incorrect Recommendation',
    'Recommendation Flow Breakdown',
    'Viewing Flow Breakdown',
    'Date/Time Extraction Error',
    'No Response (System Failure)',
    'Response Formatting Issue',
    'Verbose or Vague Response',
    'High Latency / Delayed Response',
    'Human Did Not Join',
    'Empty or Null Response',
    'others',
  ];

  // Auto-hide save status after 2 seconds
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Load existing assessment
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        setIsLoading(true);
        const response = await api.qaAssessments.get(conversation.id);
        if (response.data) {
          setRating(response.data.rating || null);
          setTags(response.data.tags || []);
          setNotes(response.data.notes || '');
        }
      } catch (error) {
        // Assessment might not exist yet - this is expected for new conversations
      } finally {
        setIsLoading(false);
      }
    };
    loadAssessment();
  }, [conversation.id]);

  const ratingMutation = useMutation(
    (newRating: 'good' | 'okay' | 'bad') => api.qaAssessments.setRating(conversation.id, newRating),
    {
      onMutate: () => setSaveStatus('saving'),
      onSuccess: () => {
        setSaveStatus('saved');
        queryClient.invalidateQueries(['conversation', conversation.id]);
        queryClient.invalidateQueries(['qaAssessments']);
      },
      onError: () => setSaveStatus('error'),
    }
  );

  const notesMutation = useMutation(
    (newNotes: string) => api.qaAssessments.setNotes(conversation.id, newNotes),
    {
      onMutate: () => setSaveStatus('saving'),
      onSuccess: () => {
        setSaveStatus('saved');
        queryClient.invalidateQueries(['conversation', conversation.id]);
        queryClient.invalidateQueries(['qaAssessments']);
      },
      onError: (error) => {
        console.error('Error saving notes:', error);
        setSaveStatus('error');
      },
    }
  );

  const addTagMutation = useMutation(
    (tag: string) => api.qaAssessments.addTags(conversation.id, [tag]),
    {
      onMutate: () => setSaveStatus('saving'),
      onSuccess: (_, tag) => {
        setSaveStatus('saved');
        queryClient.invalidateQueries(['conversation', conversation.id]);
        queryClient.invalidateQueries(['qaAssessments']);
        setTags((prev) => [...prev, tag]);
        setNewTag('');
        setShowTagDropdown(false);
      },
      onError: () => setSaveStatus('error'),
    }
  );

  const removeTagMutation = useMutation(
    (tagToRemove: string) => api.qaAssessments.removeTags(conversation.id, [tagToRemove]),
    {
      onSuccess: (_, tagToRemove) => {
        queryClient.invalidateQueries(['conversation', conversation.id]);
        setTags((prev) => prev.filter(t => t !== tagToRemove));
      },
    }
  );

  const handleRatingChange = (newRating: 'good' | 'okay' | 'bad') => {
    setRating(newRating);
    ratingMutation.mutate(newRating);
  };

  const handleAddTag = (tagToAdd?: string) => {
    const tag = tagToAdd || newTag.trim();
    if (tag && !tags.includes(tag)) {
      addTagMutation.mutate(tag);
    }
  };

  const handleRemoveTag = (tag: string) => {
    removeTagMutation.mutate(tag);
  };

  // Filter available tags based on input
  const filteredTags = newTag.trim()
    ? availableTags.filter(tag =>
        tag.toLowerCase().includes(newTag.toLowerCase()) && !tags.includes(tag)
      )
    : availableTags.filter(tag => !tags.includes(tag));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(event.target as Node)
      ) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSaveNotes = () => {
    notesMutation.mutate(notes);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">Loading QA tools...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">QA Assessment</h2>
        
        {/* Save Status Indicator */}
        {saveStatus !== 'idle' && (
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-600 font-medium">Saved!</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm text-red-600">Save failed</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleRatingChange('good')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              rating === 'good'
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Good
          </button>
          <button
            onClick={() => handleRatingChange('okay')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              rating === 'okay'
                ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Okay
          </button>
          <button
            onClick={() => handleRatingChange('bad')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              rating === 'bad'
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Bad
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="relative mb-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={tagInputRef}
                type="text"
                value={newTag}
                onChange={(e) => {
                  setNewTag(e.target.value);
                  setShowTagDropdown(true);
                }}
                onFocus={() => setShowTagDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredTags.length > 0) {
                      handleAddTag(filteredTags[0]);
                    }
                  } else if (e.key === 'Escape') {
                    setShowTagDropdown(false);
                  }
                }}
                placeholder="Type to search tags..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
              
              {/* Dropdown */}
              {showTagDropdown && filteredTags.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                >
                  {/* Existing tags */}
                  {filteredTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (filteredTags.length > 0) {
                  handleAddTag(filteredTags[0]);
                }
              }}
              disabled={!newTag.trim() || filteredTags.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Reviewer Notes</label>
          <button
            onClick={handleSaveNotes}
            disabled={notesMutation.isLoading}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {notesMutation.isLoading ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes about this conversation..."
          rows={8}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Metadata */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">System Metadata</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Interaction Type:</dt>
            <dd className="text-gray-900 font-medium">{conversation.interactionType}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Participant Count:</dt>
            <dd className="text-gray-900 font-medium">{conversation.participantCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Conversation intent:</dt>
            <dd className="text-gray-900 font-medium">{conversation.detectedIntent || 'None'}</dd>
          </div>
          {conversation.needsHuman !== undefined && conversation.needsHuman !== null && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Needs human:</dt>
              <dd className="text-gray-900 font-medium">{conversation.needsHuman ? 'Yes' : 'No'}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Channel:</dt>
            <dd className="text-gray-900 font-medium capitalize">{conversation.channel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Outcome:</dt>
            <dd className="text-gray-900 font-medium capitalize">{conversation.outcome}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
