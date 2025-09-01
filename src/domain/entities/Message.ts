// Domain Entity - Message
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  model?: string;
  metadata?: {
    tokens?: number;
    temperature?: number;
    reasoning_effort?: string;
    tools_used?: string[];
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
  config: ChatConfig;
}

export interface ChatConfig {
  temperature: number;
  max_tokens: number;
  top_p: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
  tools?: Array<{
    type: 'browser_search' | 'code_interpreter';
  }>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'premium';
  preferences: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  defaultModel: string;
  defaultConfig: ChatConfig;
}