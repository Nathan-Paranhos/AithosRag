// Infrastructure Repository Implementation
import { IChatRepository } from '../../domain/repositories/IChatRepository';
import { ChatSession, Message, ChatConfig } from '../../domain/entities/Message';
import { v4 as uuidv4 } from 'uuid';

export class ChatRepository implements IChatRepository {
  private sessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, Message[]> = new Map();

  async createSession(title: string, model: string, config: ChatConfig): Promise<ChatSession> {
    const session: ChatSession = {
      id: uuidv4(),
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model,
      config
    };

    this.sessions.set(session.id, session);
    this.messages.set(session.id, []);
    
    return session;
  }

  async getSession(id: string): Promise<ChatSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;

    const messages = this.messages.get(id) || [];
    return {
      ...session,
      messages
    };
  }

  async getAllSessions(userId?: string): Promise<ChatSession[]> {
    const sessions = Array.from(this.sessions.values());
    
    // In a real implementation, filter by userId
    return sessions.map(session => ({
      ...session,
      messages: this.messages.get(session.id) || []
    }));
  }

  async updateSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };

    this.sessions.set(id, updatedSession);
    
    const messages = this.messages.get(id) || [];
    return {
      ...updatedSession,
      messages
    };
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    this.messages.delete(id);
  }

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    const messages = this.messages.get(sessionId) || [];
    messages.push(newMessage);
    this.messages.set(sessionId, messages);

    // Update session's updatedAt
    const session = this.sessions.get(sessionId);
    if (session) {
      session.updatedAt = new Date();
      this.sessions.set(sessionId, session);
    }

    return newMessage;
  }

  async getMessages(sessionId: string, limit?: number, offset?: number): Promise<Message[]> {
    const messages = this.messages.get(sessionId) || [];
    
    if (offset !== undefined && limit !== undefined) {
      return messages.slice(offset, offset + limit);
    }
    
    if (limit !== undefined) {
      return messages.slice(-limit);
    }
    
    return messages;
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message> {
    for (const [sessionId, messages] of this.messages.entries()) {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        const updatedMessage = {
          ...messages[messageIndex],
          ...updates
        };
        messages[messageIndex] = updatedMessage;
        this.messages.set(sessionId, messages);
        return updatedMessage;
      }
    }
    throw new Error('Message not found');
  }

  async deleteMessage(messageId: string): Promise<void> {
    for (const [sessionId, messages] of this.messages.entries()) {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        messages.splice(messageIndex, 1);
        this.messages.set(sessionId, messages);
        return;
      }
    }
    throw new Error('Message not found');
  }

  async searchMessages(query: string, userId?: string): Promise<Message[]> {
    const allMessages: Message[] = [];
    
    for (const messages of this.messages.values()) {
      allMessages.push(...messages);
    }
    
    return allMessages.filter(message => 
      message.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getSessionAnalytics(sessionId: string): Promise<{
    messageCount: number;
    totalTokens: number;
    averageResponseTime: number;
    modelsUsed: string[];
  }> {
    const messages = this.messages.get(sessionId) || [];
    const session = this.sessions.get(sessionId);
    
    const totalTokens = messages.reduce((sum, msg) => 
      sum + (msg.metadata?.tokens || 0), 0
    );
    
    const modelsUsed = [...new Set(messages
      .filter(msg => msg.model)
      .map(msg => msg.model!)
    )];
    
    return {
      messageCount: messages.length,
      totalTokens,
      averageResponseTime: 0, // Would calculate from timestamps in real implementation
      modelsUsed
    };
  }
}