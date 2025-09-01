// Clean Architecture Integration Hook
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ServiceFactory } from '../infrastructure/factories/ServiceFactory';
import { ChatUseCases } from '../application/usecases/ChatUseCases';
import { Message, ChatSession, ChatConfig } from '../domain/entities/Message';
import {
  IGroqService,
  INotificationService,
  IAnalyticsService,
  ISecurityService,
  IFileService
} from '../application/interfaces/IGroqService';

interface UseCleanArchitectureReturn {
  // Use Cases
  chatUseCases: ChatUseCases;
  
  // Services
  groqService: IGroqService;
  notificationService: INotificationService;
  analyticsService: IAnalyticsService;
  securityService: ISecurityService;
  fileService: IFileService;
  
  // State
  isLoading: boolean;
  error: string | null;
  healthStatus: {
    repositories: Record<string, boolean>;
    services: Record<string, boolean>;
    overall: boolean;
  } | null;
  
  // Actions
  sendMessage: (content: string, config?: ChatConfig) => Promise<Message | null>;
  createSession: (title?: string, config?: ChatConfig) => Promise<ChatSession | null>;
  getSessions: () => Promise<ChatSession[]>;
  getMessages: (sessionId: string) => Promise<Message[]>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  searchMessages: (query: string, sessionId?: string) => Promise<Message[]>;
  
  // Analytics
  trackEvent: (event: string, properties?: Record<string, any>) => Promise<void>;
  trackUserAction: (action: string, metadata?: Record<string, any>) => Promise<void>;
  
  // Security
  sanitizeInput: (input: string) => string;
  checkRateLimit: (identifier: string, limit: number, windowMs: number) => Promise<boolean>;
  
  // File Operations
  uploadFile: (file: File, options?: { onProgress?: (progress: any) => void }) => Promise<string | null>;
  downloadFile: (fileId: string) => Promise<Blob | null>;
  
  // Notifications
  showSuccess: (message: string) => Promise<void>;
  showError: (message: string) => Promise<void>;
  showInfo: (message: string) => Promise<void>;
  
  // Health Check
  checkHealth: () => Promise<void>;
}

export const useCleanArchitecture = (userId?: string): UseCleanArchitectureReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<UseCleanArchitectureReturn['healthStatus']>(null);

  // Memoized services - created once and reused
  const services = useMemo(() => {
    return {
      chatUseCases: ServiceFactory.getChatUseCases(),
      groqService: ServiceFactory.getGroqService(),
      notificationService: ServiceFactory.getNotificationService(),
      analyticsService: ServiceFactory.getAnalyticsService(),
      securityService: ServiceFactory.getSecurityService(),
      fileService: ServiceFactory.getFileService()
    };
  }, []);

  // Initialize health check on mount
  useEffect(() => {
    checkHealth();
  }, []);

  // Error handler
  const handleError = useCallback((error: any, context: string) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Clean Architecture Error [${context}]:`, error);
    setError(errorMessage);
    
    // Track error
    services.analyticsService.trackEvent('error_occurred', {
      context,
      error: errorMessage,
      userId
    }).catch(console.error);
    
    // Show error notification
    services.notificationService.notifyError(`Error in ${context}: ${errorMessage}`)
      .catch(console.error);
  }, [services, userId]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Chat Operations
  const sendMessage = useCallback(async (
    content: string,
    config?: ChatConfig
  ): Promise<Message | null> => {
    try {
      setIsLoading(true);
      clearError();
      
      // Sanitize input
      const sanitizedContent = services.securityService.sanitizeInput(content);
      
      // Check rate limit
      const rateLimitKey = userId || 'anonymous';
      const canProceed = await services.securityService.checkRateLimit(
        rateLimitKey,
        10, // 10 messages
        60000 // per minute
      );
      
      if (!canProceed) {
        throw new Error('Rate limit exceeded. Please wait before sending another message.');
      }
      
      // Send message through use case
      const message = await services.chatUseCases.sendMessage(
        sanitizedContent,
        config || { model: 'llama-3.1-8b-instant', temperature: 0.7 }
      );
      
      // Track successful message
      await services.analyticsService.trackUserAction(
        userId || 'anonymous',
        'message_sent',
        {
          messageLength: sanitizedContent.length,
          model: config?.model || 'llama-3.1-8b-instant'
        }
      );
      
      return message;
    } catch (error) {
      handleError(error, 'sendMessage');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [services, userId, handleError, clearError]);

  const createSession = useCallback(async (
    title?: string,
    config?: ChatConfig
  ): Promise<ChatSession | null> => {
    try {
      setIsLoading(true);
      clearError();
      
      const session = await services.chatUseCases.createChatSession(title, config);
      
      await services.analyticsService.trackUserAction(
        userId || 'anonymous',
        'session_created',
        { title, model: config?.model }
      );
      
      return session;
    } catch (error) {
      handleError(error, 'createSession');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [services, userId, handleError, clearError]);

  const getSessions = useCallback(async (): Promise<ChatSession[]> => {
    try {
      setIsLoading(true);
      clearError();
      
      return await services.chatUseCases.getChatHistory();
    } catch (error) {
      handleError(error, 'getSessions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [services, handleError, clearError]);

  const getMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
    try {
      setIsLoading(true);
      clearError();
      
      return await services.chatUseCases.getSessionMessages(sessionId);
    } catch (error) {
      handleError(error, 'getMessages');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [services, handleError, clearError]);

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      clearError();
      
      const success = await services.chatUseCases.deleteChatSession(sessionId);
      
      if (success) {
        await services.analyticsService.trackUserAction(
          userId || 'anonymous',
          'session_deleted',
          { sessionId }
        );
      }
      
      return success;
    } catch (error) {
      handleError(error, 'deleteSession');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [services, userId, handleError, clearError]);

  const searchMessages = useCallback(async (
    query: string,
    sessionId?: string
  ): Promise<Message[]> => {
    try {
      setIsLoading(true);
      clearError();
      
      const sanitizedQuery = services.securityService.sanitizeInput(query);
      const results = await services.chatUseCases.searchMessages(sanitizedQuery, sessionId);
      
      await services.analyticsService.trackUserAction(
        userId || 'anonymous',
        'messages_searched',
        { query: sanitizedQuery, resultsCount: results.length }
      );
      
      return results;
    } catch (error) {
      handleError(error, 'searchMessages');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [services, userId, handleError, clearError]);

  // Analytics Operations
  const trackEvent = useCallback(async (
    event: string,
    properties?: Record<string, any>
  ): Promise<void> => {
    try {
      await services.analyticsService.trackEvent(event, {
        ...properties,
        userId
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [services, userId]);

  const trackUserAction = useCallback(async (
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> => {
    try {
      if (userId) {
        await services.analyticsService.trackUserAction(userId, action, metadata);
      }
    } catch (error) {
      console.error('Failed to track user action:', error);
    }
  }, [services, userId]);

  // Security Operations
  const sanitizeInput = useCallback((input: string): string => {
    return services.securityService.sanitizeInput(input);
  }, [services]);

  const checkRateLimit = useCallback(async (
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> => {
    try {
      return await services.securityService.checkRateLimit(identifier, limit, windowMs);
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }
  }, [services]);

  // File Operations
  const uploadFile = useCallback(async (
    file: File,
    options?: { onProgress?: (progress: any) => void }
  ): Promise<string | null> => {
    try {
      setIsLoading(true);
      clearError();
      
      const fileId = await services.fileService.uploadFile(file, {
        userId,
        onProgress: options?.onProgress
      });
      
      await services.analyticsService.trackUserAction(
        userId || 'anonymous',
        'file_uploaded',
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }
      );
      
      return fileId;
    } catch (error) {
      handleError(error, 'uploadFile');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [services, userId, handleError, clearError]);

  const downloadFile = useCallback(async (fileId: string): Promise<Blob | null> => {
    try {
      setIsLoading(true);
      clearError();
      
      const blob = await services.fileService.downloadFile(fileId);
      
      await services.analyticsService.trackUserAction(
        userId || 'anonymous',
        'file_downloaded',
        { fileId }
      );
      
      return blob;
    } catch (error) {
      handleError(error, 'downloadFile');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [services, userId, handleError, clearError]);

  // Notification Operations
  const showSuccess = useCallback(async (message: string): Promise<void> => {
    try {
      await services.notificationService.notifySuccess(message);
    } catch (error) {
      console.error('Failed to show success notification:', error);
    }
  }, [services]);

  const showError = useCallback(async (message: string): Promise<void> => {
    try {
      await services.notificationService.notifyError(message);
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }, [services]);

  const showInfo = useCallback(async (message: string): Promise<void> => {
    try {
      await services.notificationService.notifyInfo(message);
    } catch (error) {
      console.error('Failed to show info notification:', error);
    }
  }, [services]);

  // Health Check
  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      const health = await ServiceFactory.healthCheck();
      setHealthStatus(health);
      
      if (!health.overall) {
        console.warn('System health check failed:', health);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({
        repositories: {},
        services: {},
        overall: false
      });
    }
  }, []);

  return {
    // Use Cases
    chatUseCases: services.chatUseCases,
    
    // Services
    groqService: services.groqService,
    notificationService: services.notificationService,
    analyticsService: services.analyticsService,
    securityService: services.securityService,
    fileService: services.fileService,
    
    // State
    isLoading,
    error,
    healthStatus,
    
    // Actions
    sendMessage,
    createSession,
    getSessions,
    getMessages,
    deleteSession,
    searchMessages,
    
    // Analytics
    trackEvent,
    trackUserAction,
    
    // Security
    sanitizeInput,
    checkRateLimit,
    
    // File Operations
    uploadFile,
    downloadFile,
    
    // Notifications
    showSuccess,
    showError,
    showInfo,
    
    // Health Check
    checkHealth
  };
};

export default useCleanArchitecture;