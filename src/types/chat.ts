export interface ContextSource {
  type: 'commit' | 'file' | 'diff';
  reference: string;
  relevanceScore: number;
  metadata?: any;
}

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: number;
  confidence?: number;
  contextSources?: ContextSource[];
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: number;
  title?: string;
}