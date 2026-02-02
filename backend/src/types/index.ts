// Core entity types matching the design document

export type Channel = 'website' | 'whatsapp';
export type Outcome = 'qualified' | 'dropped' | 'escalated' | 'ongoing';
export type CSAT = 'good' | 'bad' | null;
export type MessageSender = 'user' | 'ai' | 'human';
export type MessageType = 'text' | 'image' | 'file' | 'system';
export type QARating = 'good' | 'okay' | 'bad';
export type InteractionType = 'ai_only' | 'human_only' | 'ai_to_human_handover' | 'mixed';

export interface Conversation {
  id: string;
  channel: Channel;
  startTime: Date;
  endTime: Date | null;
  participantCount: number;
  aiAgentVersion: string;
  promptVersion: string;
  kbVersion: string;
  detectedIntent: string | null;
  outcome: Outcome;
  csat: CSAT;
  humanHandover: boolean;
  interactionType: InteractionType;
  autoSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
  lastMessageTime?: Date | null;
  leadCreated?: boolean | null; // Extracted from meta.able_to_create_lead
  /** SalesIQ conversation URL (built from salesiq_conversation_id) */
  salesiqConversationUrl?: string | null;
  /** CRM lead URL (built from lead_id) */
  leadUrl?: string | null;
  /** Zoho Desk ticket URL (built from zoho_ticket_id) */
  zohoDeskTicketUrl?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  messageType: MessageType;
  intent: string | null; // Message-level intent
  processingLatency: number | null;
  langsmithTraceId: string | null;
  promptUsed: string | null;
  ragContext: string | null;
  modelOutput: string | null;
  toolCalls: ToolCall[] | null;
  errors: string[] | null;
  operatorName?: string; // Operator name for human messages (from meta)
}

export interface ToolCall {
  toolName: string;
  input: Record<string, any>;
  output: Record<string, any>;
  duration: number;
  success: boolean;
}

export interface QAAssessment {
  id: string;
  conversationId: string;
  reviewerId: string;
  rating: QARating;
  tags: string[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationFilters {
  csat?: ('good' | 'okay' | 'bad' | null)[];
  intent?: string[];
  channel?: Channel[];
  dateFrom?: string;
  dateTo?: string;
  humanHandover?: boolean;
  leadCreated?: boolean | null; // Filter by whether lead was created (from meta.able_to_create_lead)
}
