import axios from 'axios';

// @ts-ignore - Vite env types
// Default /api uses Vite dev proxy to localhost:5000; set VITE_API_URL for production or direct backend.
const API_URL = import.meta.env?.VITE_API_URL ?? '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Conversation {
  id: string;
  channel: 'website' | 'whatsapp';
  startTime: string;
  endTime: string | null;
  participantCount: number;
  detectedIntent: string | null;
  /** From conversation_intent JSON - whether intent classification flagged needs_human */
  needsHuman?: boolean | null;
  outcome: 'qualified' | 'dropped' | 'escalated' | 'ongoing';
  csat: 'good' | 'bad' | null;
  humanHandover: boolean;
  interactionType: 'ai_only' | 'human_only' | 'ai_to_human_handover' | 'mixed';
  autoSummary: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessageTime?: string | null;
  leadCreated?: boolean | null; // Extracted from meta.able_to_create_lead
  /** Student CSAT derived from whatsapp_conversations.meta.feedback.value */
  studentCsat?: 'positive' | 'negative' | 'no_feedback';
  /** SalesIQ conversation URL */
  salesiqConversationUrl?: string | null;
  /** CRM lead URL (Amber dashboard) */
  leadUrl?: string | null;
  /** Zoho Desk ticket URL */
  zohoDeskTicketUrl?: string | null;
}

export interface QAAssessment {
  id: string;
  conversationId: string;
  reviewerId: string;
  rating: 'good' | 'okay' | 'bad';
  tags: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai' | 'human';
  content: string;
  timestamp: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  intent: string | string[] | null; // Message-level intent (may be a single value or list)
  /** Flattened, human-readable representation of message-level sub_intent JSON */
  subIntent?: string | null;
  processingLatency: number | null;
  langsmithTraceId: string | null;
  promptUsed: string | null;
  ragContext: string | null;
  modelOutput: string | null;
  toolCalls: any[] | null;
  errors: string[] | null;
  operatorName?: string; // Operator name for human messages (from meta)
}

export interface ConversationFilters {
  csat?: ('good' | 'okay' | 'bad' | null)[];
  intent?: string[];
  channel?: ('website' | 'whatsapp')[];
  dateFrom?: string;
  dateTo?: string;
  humanHandover?: boolean;
  leadCreated?: boolean | null;
  /** From conversation_intent.needs_human - filter by intent-level needs human flag */
  needsHuman?: boolean;
  search?: string;
  /** Student CSAT filter derived from meta.feedback.value */
  studentCsat?: ('positive' | 'negative' | 'no_feedback')[];
}

export interface ConversationListResponse {
  data: {
    conversations: Conversation[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface FilterOptions {
  csatOptions: Array<{ value: string | null; label: string }>;
  intentOptions: string[];
  channelOptions: Array<{ value: string; label: string }>;
  leadCreatedOptions?: Array<{ value: boolean | null; label: string }>;
  studentCsatOptions?: Array<{ value: 'positive' | 'negative' | 'no_feedback'; label: string }>;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data as { token: string; user: AuthUser };
  },
  me: async (): Promise<{ user: AuthUser }> => {
    const res = await apiClient.get('/auth/me');
    return res.data as { user: AuthUser };
  },
};

export const api = {
  conversations: {
    list: async (filters: ConversationFilters = {}, page: number = 1, pageSize: number = 50, search?: string, sortBy?: string): Promise<ConversationListResponse> => {
      const params = new URLSearchParams();
      
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      
      if (sortBy) {
        params.append('sortBy', sortBy);
      }
      
      if (filters.csat) {
        filters.csat.forEach(c => params.append('csat', c === null ? 'null' : c));
      }
      if (filters.intent) {
        filters.intent.forEach(i => params.append('intent', i));
      }
      if (filters.channel) {
        filters.channel.forEach(c => params.append('channel', c));
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      if (filters.humanHandover !== undefined) {
        params.append('humanHandover', filters.humanHandover.toString());
      }
      if (filters.leadCreated !== undefined) {
        if (filters.leadCreated === null) {
          params.append('leadCreated', 'null');
        } else {
          params.append('leadCreated', filters.leadCreated.toString());
        }
      }
      if (filters.needsHuman !== undefined) {
        params.append('needsHuman', filters.needsHuman.toString());
      }
      if (filters.studentCsat) {
        filters.studentCsat.forEach(s => params.append('studentCsat', s));
      }
      
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      const response = await apiClient.get(`/conversations?${params.toString()}`);
      return response.data;
    },
    
    get: async (id: string, includeMessages: boolean = false): Promise<{ data: Conversation & { messages?: Message[] } }> => {
      const params = includeMessages ? '?messages=true' : '';
      const response = await apiClient.get(`/conversations/${id}${params}`);
      return response.data;
    },
    
    getFilterOptions: async (): Promise<{ data: FilterOptions }> => {
      const response = await apiClient.get('/conversations/filters');
      return response.data;
    },
  },
  
  messages: {
    getDebugInfo: async (messageId: string): Promise<any> => {
      const response = await apiClient.get(`/messages/${messageId}/debug`);
      return response.data;
    },
  },
  
  qaAssessments: {
    get: async (conversationId: string) => {
      const response = await apiClient.get(`/qa-assessments/${conversationId}`);
      return response.data;
    },
    
    getAllTags: async (): Promise<{ data: string[] }> => {
      const response = await apiClient.get('/qa-assessments/tags');
      return response.data;
    },

    deleteTag: async (tag: string) => {
      await apiClient.delete('/qa-assessments/tags', { data: { tag } });
    },
    
    getBulk: async (conversationIds: string[]) => {
      const response = await apiClient.post('/qa-assessments/bulk', { conversationIds });
      return response.data;
    },
    
    setRating: async (conversationId: string, rating: 'good' | 'okay' | 'bad') => {
      const response = await apiClient.post(`/qa-assessments/${conversationId}/rating`, { rating });
      return response.data;
    },
    
    addTags: async (conversationId: string, tags: string[]) => {
      await apiClient.post(`/qa-assessments/${conversationId}/tags`, { tags });
    },
    
    removeTags: async (conversationId: string, tags: string[]) => {
      await apiClient.delete(`/qa-assessments/${conversationId}/tags`, { data: { tags } });
    },
    
    setNotes: async (conversationId: string, notes: string) => {
      const response = await apiClient.post(`/qa-assessments/${conversationId}/notes`, { notes });
      return response.data;
    },
    
    update: async (conversationId: string, updates: { rating?: 'good' | 'okay' | 'bad'; tags?: string[]; notes?: string }) => {
      const response = await apiClient.patch(`/qa-assessments/${conversationId}`, updates);
      return response.data;
    },
    
    setBulkRating: async (conversationIds: string[], rating: 'good' | 'okay' | 'bad') => {
      const response = await apiClient.post('/qa-assessments/bulk/rating', { conversationIds, rating });
      return response.data;
    },
    
    addBulkTags: async (conversationIds: string[], tags: string[]) => {
      await apiClient.post('/qa-assessments/bulk/tags', { conversationIds, tags });
    },
  },
};

export default apiClient;
