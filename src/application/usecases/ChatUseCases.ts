// Application Use Cases
import { IChatRepository, IUserRepository, ICacheRepository } from '../../domain/repositories/IChatRepository';
import { ChatSession, Message, ChatConfig, User } from '../../domain/entities/Message';
import { IGroqService } from '../interfaces/IGroqService';
import { INotificationService } from '../interfaces/INotificationService';

export class ChatUseCases {
  constructor(
    private chatRepository: IChatRepository,
    private userRepository: IUserRepository,
    private cacheRepository: ICacheRepository,
    private groqService: IGroqService,
    private notificationService: INotificationService
  ) {}

  async createChatSession(
    userId: string,
    title: string,
    model: string,
    config: ChatConfig
  ): Promise<ChatSession> {
    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create session
    const session = await this.chatRepository.createSession(title, model, config);
    
    // Cache session for quick access
    await this.cacheRepository.set(`session:${session.id}`, session, 3600);
    
    return session;
  }

  async sendMessage(
    sessionId: string,
    content: string,
    userId: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    // Get session
    let session = await this.cacheRepository.get<ChatSession>(`session:${sessionId}`);
    if (!session) {
      session = await this.chatRepository.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
    }

    // Add user message
    const userMessage = await this.chatRepository.addMessage(sessionId, {
      content,
      role: 'user'
    });

    try {
      // Get AI response
      const aiResponse = await this.groqService.generateResponse(
        [...session.messages, userMessage],
        session.model,
        session.config
      );

      // Add assistant message
      const assistantMessage = await this.chatRepository.addMessage(sessionId, {
        content: aiResponse.content,
        role: 'assistant',
        model: session.model,
        metadata: {
          tokens: aiResponse.tokens,
          temperature: session.config.temperature,
          reasoning_effort: session.config.reasoning_effort,
          tools_used: aiResponse.tools_used
        }
      });

      // Update session cache
      const updatedSession = await this.chatRepository.getSession(sessionId);
      if (updatedSession) {
        await this.cacheRepository.set(`session:${sessionId}`, updatedSession, 3600);
      }

      return { userMessage, assistantMessage };
    } catch (error) {
      // Log error and notify user
      console.error('Error generating AI response:', error);
      await this.notificationService.notifyError(userId, 'Failed to generate response');
      throw error;
    }
  }

  async getChatHistory(userId: string, limit = 20): Promise<ChatSession[]> {
    const cacheKey = `user:${userId}:sessions`;
    let sessions = await this.cacheRepository.get<ChatSession[]>(cacheKey);
    
    if (!sessions) {
      sessions = await this.chatRepository.getAllSessions(userId);
      await this.cacheRepository.set(cacheKey, sessions, 1800); // 30 minutes
    }
    
    return sessions.slice(0, limit);
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    // Verify ownership
    const session = await this.chatRepository.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Delete session
    await this.chatRepository.deleteSession(sessionId);
    
    // Clear cache
    await this.cacheRepository.delete(`session:${sessionId}`);
    await this.cacheRepository.delete(`user:${userId}:sessions`);
  }

  async searchMessages(query: string, userId: string): Promise<Message[]> {
    const cacheKey = `search:${userId}:${query}`;
    let results = await this.cacheRepository.get<Message[]>(cacheKey);
    
    if (!results) {
      results = await this.chatRepository.searchMessages(query, userId);
      await this.cacheRepository.set(cacheKey, results, 600); // 10 minutes
    }
    
    return results;
  }

  async getSessionAnalytics(sessionId: string): Promise<any> {
    const cacheKey = `analytics:${sessionId}`;
    let analytics = await this.cacheRepository.get(cacheKey);
    
    if (!analytics) {
      analytics = await this.chatRepository.getSessionAnalytics(sessionId);
      await this.cacheRepository.set(cacheKey, analytics, 3600);
    }
    
    return analytics;
  }
}