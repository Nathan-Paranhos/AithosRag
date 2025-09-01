// Factory Pattern Implementation
import { IChatRepository, IUserRepository, ICacheRepository } from '../../domain/repositories/IChatRepository';
import { IGroqService, INotificationService, IAnalyticsService, ISecurityService, IFileService } from '../../application/interfaces/IGroqService';
import { ChatRepository } from '../repositories/ChatRepository';
import { UserRepository } from '../repositories/UserRepository';
import { CacheRepository } from '../repositories/CacheRepository';
import { GroqService } from '../services/GroqService';
import { NotificationService } from '../services/NotificationService';
import { AnalyticsService } from '../services/AnalyticsService';
import { SecurityService } from '../services/SecurityService';
import { FileService } from '../services/FileService';
import { ChatUseCases } from '../../application/usecases/ChatUseCases';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  // Repository Factory Methods
  getChatRepository(): IChatRepository {
    if (!this.services.has('chatRepository')) {
      this.services.set('chatRepository', new ChatRepository());
    }
    return this.services.get('chatRepository');
  }

  getUserRepository(): IUserRepository {
    if (!this.services.has('userRepository')) {
      this.services.set('userRepository', new UserRepository());
    }
    return this.services.get('userRepository');
  }

  getCacheRepository(): ICacheRepository {
    if (!this.services.has('cacheRepository')) {
      this.services.set('cacheRepository', new CacheRepository());
    }
    return this.services.get('cacheRepository');
  }

  // Service Factory Methods
  getGroqService(): IGroqService {
    if (!this.services.has('groqService')) {
      this.services.set('groqService', new GroqService());
    }
    return this.services.get('groqService');
  }

  getNotificationService(): INotificationService {
    if (!this.services.has('notificationService')) {
      this.services.set('notificationService', new NotificationService());
    }
    return this.services.get('notificationService');
  }

  getAnalyticsService(): IAnalyticsService {
    if (!this.services.has('analyticsService')) {
      this.services.set('analyticsService', new AnalyticsService());
    }
    return this.services.get('analyticsService');
  }

  getSecurityService(): ISecurityService {
    if (!this.services.has('securityService')) {
      this.services.set('securityService', new SecurityService());
    }
    return this.services.get('securityService');
  }

  getFileService(): IFileService {
    if (!this.services.has('fileService')) {
      this.services.set('fileService', new FileService());
    }
    return this.services.get('fileService');
  }

  // Use Case Factory Methods
  getChatUseCases(): ChatUseCases {
    if (!this.services.has('chatUseCases')) {
      const chatUseCases = new ChatUseCases(
        this.getChatRepository(),
        this.getUserRepository(),
        this.getCacheRepository(),
        this.getGroqService(),
        this.getNotificationService()
      );
      this.services.set('chatUseCases', chatUseCases);
    }
    return this.services.get('chatUseCases');
  }

  // Configuration Methods
  configure(serviceName: string, implementation: any): void {
    this.services.set(serviceName, implementation);
  }

  reset(): void {
    this.services.clear();
  }

  // Health Check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, boolean>;
  }> {
    const serviceChecks: Record<string, boolean> = {};
    let allHealthy = true;

    // Check each service
    try {
      const groqService = this.getGroqService();
      serviceChecks.groq = groqService.getAvailableModels().length > 0;
    } catch {
      serviceChecks.groq = false;
      allHealthy = false;
    }

    try {
      const chatRepo = this.getChatRepository();
      serviceChecks.chatRepository = true;
    } catch {
      serviceChecks.chatRepository = false;
      allHealthy = false;
    }

    try {
      const cacheRepo = this.getCacheRepository();
      serviceChecks.cache = true;
    } catch {
      serviceChecks.cache = false;
      allHealthy = false;
    }

    try {
      const fileService = this.getFileService();
      serviceChecks.file = true;
    } catch {
      serviceChecks.file = false;
      allHealthy = false;
    }

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services: serviceChecks
    };
  }
}

// Singleton instance export
export const serviceFactory = ServiceFactory.getInstance();