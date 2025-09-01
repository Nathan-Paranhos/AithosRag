// Domain Repository Interface
import { ChatSession, Message, ChatConfig } from '../entities/Message';

export interface IChatRepository {
  // Chat Sessions
  createSession(title: string, model: string, config: ChatConfig): Promise<ChatSession>;
  getSession(id: string): Promise<ChatSession | null>;
  getAllSessions(userId?: string): Promise<ChatSession[]>;
  updateSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession>;
  deleteSession(id: string): Promise<void>;

  // Messages
  addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message>;
  getMessages(sessionId: string, limit?: number, offset?: number): Promise<Message[]>;
  updateMessage(messageId: string, updates: Partial<Message>): Promise<Message>;
  deleteMessage(messageId: string): Promise<void>;

  // Search and Analytics
  searchMessages(query: string, userId?: string): Promise<Message[]>;
  getSessionAnalytics(sessionId: string): Promise<{
    messageCount: number;
    totalTokens: number;
    averageResponseTime: number;
    modelsUsed: string[];
  }>;
}

export interface IUserRepository {
  create(userData: Omit<import('../entities/Message').User, 'id' | 'createdAt'>): Promise<import('../entities/Message').User>;
  findById(id: string): Promise<import('../entities/Message').User | null>;
  findByEmail(email: string): Promise<import('../entities/Message').User | null>;
  update(id: string, updates: Partial<import('../entities/Message').User>): Promise<import('../entities/Message').User>;
  delete(id: string): Promise<void>;
}

export interface ICacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
}