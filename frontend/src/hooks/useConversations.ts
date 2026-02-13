import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api, ConversationFilters, Conversation, ConversationListResponse } from '../services/api';

export const useConversations = (
  filters: ConversationFilters = {},
  page: number = 1,
  pageSize: number = 50,
  search?: string,
  sortBy?: string
) => {
  return useQuery<ConversationListResponse, Error>(
    ['conversations', filters, page, pageSize, search, sortBy],
    () => api.conversations.list(filters, page, pageSize, search, sortBy),
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
      retry: 2,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const useConversation = (id: string, includeMessages: boolean = false) => {
  return useQuery(
    ['conversation', id, includeMessages],
    () => api.conversations.get(id, includeMessages),
    {
      enabled: !!id,
    }
  );
};

export const useFilterOptions = () => {
  return useQuery('filterOptions', () => api.conversations.getFilterOptions(), {
    staleTime: 60000, // 1 minute
    refetchOnMount: 'always', // Always fetch fresh options when filters panel mounts
  });
};

export const useUpdateConversation = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, updates }: { id: string; updates: Partial<Conversation> }) => {
      // This would call an update endpoint if we add it
      return Promise.resolve({ id, updates });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('conversations');
      },
    }
  );
};
