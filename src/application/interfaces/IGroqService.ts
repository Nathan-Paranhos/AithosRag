// Application Service Interfaces
import { Message, ChatConfig } from '../../domain/entities/Message';

export interface IGroqService {
  generateResponse(
    messages: Message[],
    model: string,
    config: ChatConfig
  ): Promise<{
    content: string;
    tokens: number;
    tools_used?: string[];
    reasoning?: string;
  }>;

  generateStreamResponse(
    messages: Message[],
    model: string,
    config: ChatConfig,
    onChunk: (chunk: string) => void
  ): Promise<{
    content: string;
    tokens: number;
    tools_used?: string[];
  }>;

  validateModel(model: string): boolean;
  getAvailableModels(): string[];
}

export interface INotificationService {
  notifySuccess(userId: string, message: string): Promise<void>;
  notifyError(userId: string, message: string): Promise<void>;
  notifyInfo(userId: string, message: string): Promise<void>;
  sendPushNotification(userId: string, title: string, body: string): Promise<void>;
}

export interface IAnalyticsService {
  trackEvent(event: string, properties: Record<string, any>): Promise<void>;
  trackUserAction(userId: string, action: string, metadata?: Record<string, any>): Promise<void>;
  trackPerformance(metric: string, value: number, tags?: Record<string, string>): Promise<void>;
  getMetrics(timeRange: string): Promise<Record<string, any>>;
}

export interface ISecurityService {
  validateInput(input: string): { isValid: boolean; sanitized: string; threats: string[] };
  encryptSensitiveData(data: string): Promise<string>;
  decryptSensitiveData(encryptedData: string): Promise<string>;
  generateSecureToken(): string;
  validateToken(token: string): Promise<{ isValid: boolean; payload?: any }>;
}

export interface IFileService {
  uploadFile(file: File, userId: string): Promise<{ url: string; id: string }>;
  deleteFile(fileId: string, userId: string): Promise<void>;
  getFileUrl(fileId: string): Promise<string>;
  validateFile(file: File): { isValid: boolean; errors: string[] };
}