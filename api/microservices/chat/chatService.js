import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import EventEmitter from 'events';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

class ChatService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 3002,
      maxMessageLength: options.maxMessageLength || 10000,
      maxConversationHistory: options.maxConversationHistory || 100,
      rateLimitWindow: options.rateLimitWindow || 60 * 1000, 
      rateLimitMax: options.rateLimitMax || 30, 
      websocketPort: options.websocketPort || 3010,
      ...options
    };

    this.app = express();
    this.server = null;
    this.wsServer = null;
    this.wss = null;
    
    this.conversations = new Map();
    this.messages = new Map();
    this.activeConnections = new Map();
    this.userSessions = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const chatLimiter = rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.rateLimitMax,
      message: {
        error: 'Too many chat requests, please slow down'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/chat', chatLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`💬 Chat Service: ${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Auth middleware (simplified - in production, verify JWT)
    this.app.use((req, res, next) => {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        // In production, verify JWT token here
        req.user = {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User'
        };
      }
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'chat-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        conversations: this.conversations.size,
        messages: this.messages.size,
        activeConnections: this.activeConnections.size
      });
    });

    // Create new conversation
    this.app.post('/chat/conversations', [
      body('title').optional().isLength({ min: 1, max: 200 }).trim(),
      body('model').optional().isIn(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro']),
      body('systemPrompt').optional().isLength({ max: 2000 })
    ], this.createConversation.bind(this));

    // Get user conversations
    this.app.get('/chat/conversations', this.getConversations.bind(this));

    // Get specific conversation
    this.app.get('/chat/conversations/:conversationId', this.getConversation.bind(this));

    // Update conversation
    this.app.put('/chat/conversations/:conversationId', [
      body('title').optional().isLength({ min: 1, max: 200 }).trim(),
      body('model').optional().isIn(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro']),
      body('systemPrompt').optional().isLength({ max: 2000 })
    ], this.updateConversation.bind(this));

    // Delete conversation
    this.app.delete('/chat/conversations/:conversationId', this.deleteConversation.bind(this));

    // Send message
    this.app.post('/chat/conversations/:conversationId/messages', [
      body('content').isLength({ min: 1, max: this.options.maxMessageLength }).trim(),
      body('type').optional().isIn(['text', 'image', 'file']),
      body('metadata').optional().isObject()
    ], this.sendMessage.bind(this));

    // Get conversation messages
    this.app.get('/chat/conversations/:conversationId/messages', this.getMessages.bind(this));

    // Delete message
    this.app.delete('/chat/messages/:messageId', this.deleteMessage.bind(this));

    // Export conversation
    this.app.get('/chat/conversations/:conversationId/export', this.exportConversation.bind(this));

    // Search conversations
    this.app.get('/chat/search', this.searchConversations.bind(this));

    // Get chat statistics
    this.app.get('/chat/stats', this.getChatStats.bind(this));
  }

  setupWebSocket() {
    this.wsServer = http.createServer();
    this.wss = new WebSocketServer({ server: this.wsServer });

    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateId();
      const clientIp = req.socket.remoteAddress;
      
      console.log(`🔌 WebSocket connected: ${connectionId} from ${clientIp}`);
      
      const connection = {
        id: connectionId,
        ws,
        userId: null,
        conversationId: null,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        clientIp
      };
      
      this.activeConnections.set(connectionId, connection);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(connectionId, message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log(`🔌 WebSocket disconnected: ${connectionId}`);
        this.activeConnections.delete(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        this.activeConnections.delete(connectionId);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  handleWebSocketMessage(connectionId, message) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    connection.lastActivity = new Date().toISOString();

    switch (message.type) {
      case 'auth':
        // Authenticate user (simplified)
        connection.userId = message.userId || 'user-123';
        connection.ws.send(JSON.stringify({
          type: 'auth_success',
          userId: connection.userId
        }));
        break;

      case 'join_conversation':
        connection.conversationId = message.conversationId;
        connection.ws.send(JSON.stringify({
          type: 'joined_conversation',
          conversationId: message.conversationId
        }));
        break;

      case 'typing':
        this.broadcastToConversation(connection.conversationId, {
          type: 'user_typing',
          userId: connection.userId,
          conversationId: connection.conversationId
        }, connectionId);
        break;

      case 'stop_typing':
        this.broadcastToConversation(connection.conversationId, {
          type: 'user_stop_typing',
          userId: connection.userId,
          conversationId: connection.conversationId
        }, connectionId);
        break;

      case 'ping':
        connection.ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        connection.ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  broadcastToConversation(conversationId, message, excludeConnectionId = null) {
    for (const [connectionId, connection] of this.activeConnections) {
      if (connection.conversationId === conversationId && connectionId !== excludeConnectionId) {
        try {
          connection.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to ${connectionId}:`, error);
        }
      }
    }
  }

  async createConversation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { title, model = 'gpt-3.5-turbo', systemPrompt } = req.body;
      const userId = req.user?.id || 'anonymous';

      const conversation = {
        id: this.generateId(),
        userId,
        title: title || `Conversation ${new Date().toLocaleString()}`,
        model,
        systemPrompt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        isActive: true,
        metadata: {
          totalTokens: 0,
          estimatedCost: 0
        }
      };

      this.conversations.set(conversation.id, conversation);
      
      this.emit('conversationCreated', { conversation, userId });

      res.status(201).json({
        message: 'Conversation created successfully',
        conversation
      });

    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getConversations(req, res) {
    try {
      const userId = req.user?.id || 'anonymous';
      const { page = 1, limit = 20, search } = req.query;
      
      let userConversations = Array.from(this.conversations.values())
        .filter(conv => conv.userId === userId && conv.isActive);

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        userConversations = userConversations.filter(conv => 
          conv.title.toLowerCase().includes(searchLower)
        );
      }

      // Sort by updated date (most recent first)
      userConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedConversations = userConversations.slice(startIndex, endIndex);

      res.json({
        conversations: paginatedConversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userConversations.length,
          pages: Math.ceil(userConversations.length / limit)
        }
      });

    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      res.json({
        conversation
      });

    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async updateConversation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { conversationId } = req.params;
      const { title, model, systemPrompt } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      // Update conversation
      if (title) conversation.title = title;
      if (model) conversation.model = model;
      if (systemPrompt !== undefined) conversation.systemPrompt = systemPrompt;
      conversation.updatedAt = new Date().toISOString();

      this.emit('conversationUpdated', { conversation, userId });

      res.json({
        message: 'Conversation updated successfully',
        conversation
      });

    } catch (error) {
      console.error('Update conversation error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      // Soft delete
      conversation.isActive = false;
      conversation.deletedAt = new Date().toISOString();

      // Delete associated messages
      for (const [messageId, message] of this.messages) {
        if (message.conversationId === conversationId) {
          this.messages.delete(messageId);
        }
      }

      this.emit('conversationDeleted', { conversation, userId });

      res.json({
        message: 'Conversation deleted successfully'
      });

    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { conversationId } = req.params;
      const { content, type = 'text', metadata = {} } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      // Create user message
      const userMessage = {
        id: this.generateId(),
        conversationId,
        userId,
        role: 'user',
        content,
        type,
        metadata,
        createdAt: new Date().toISOString(),
        tokens: this.estimateTokens(content)
      };

      this.messages.set(userMessage.id, userMessage);

      // Update conversation
      conversation.messageCount++;
      conversation.updatedAt = new Date().toISOString();
      conversation.metadata.totalTokens += userMessage.tokens;

      // Broadcast to WebSocket connections
      this.broadcastToConversation(conversationId, {
        type: 'new_message',
        message: userMessage
      });

      // Generate AI response (simplified)
      const aiResponse = await this.generateAIResponse(conversation, userMessage);
      
      const aiMessage = {
        id: this.generateId(),
        conversationId,
        userId: 'ai',
        role: 'assistant',
        content: aiResponse.content,
        type: 'text',
        metadata: aiResponse.metadata,
        createdAt: new Date().toISOString(),
        tokens: this.estimateTokens(aiResponse.content)
      };

      this.messages.set(aiMessage.id, aiMessage);

      // Update conversation
      conversation.messageCount++;
      conversation.updatedAt = new Date().toISOString();
      conversation.metadata.totalTokens += aiMessage.tokens;
      conversation.metadata.estimatedCost += aiResponse.cost || 0;

      // Broadcast AI response
      this.broadcastToConversation(conversationId, {
        type: 'new_message',
        message: aiMessage
      });

      this.emit('messagesSent', { userMessage, aiMessage, conversation });

      res.status(201).json({
        message: 'Messages sent successfully',
        userMessage,
        aiMessage
      });

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user?.id || 'anonymous';
      
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      let conversationMessages = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === conversationId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedMessages = conversationMessages.slice(startIndex, endIndex);

      res.json({
        messages: paginatedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: conversationMessages.length,
          pages: Math.ceil(conversationMessages.length / limit)
        }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      const message = this.messages.get(messageId);
      
      if (!message || message.userId !== userId) {
        return res.status(404).json({
          error: 'Message not found'
        });
      }

      this.messages.delete(messageId);

      // Update conversation message count
      const conversation = this.conversations.get(message.conversationId);
      if (conversation) {
        conversation.messageCount--;
        conversation.updatedAt = new Date().toISOString();
      }

      // Broadcast deletion
      this.broadcastToConversation(message.conversationId, {
        type: 'message_deleted',
        messageId
      });

      this.emit('messageDeleted', { message, userId });

      res.json({
        message: 'Message deleted successfully'
      });

    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async exportConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.user?.id || 'anonymous';
      
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      const messages = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === conversationId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const exportData = {
        conversation,
        messages,
        exportedAt: new Date().toISOString()
      };

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.json"`);
        res.json(exportData);
      } else if (format === 'txt') {
        const textContent = this.formatConversationAsText(conversation, messages);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.txt"`);
        res.send(textContent);
      } else {
        res.status(400).json({
          error: 'Unsupported export format'
        });
      }

    } catch (error) {
      console.error('Export conversation error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async searchConversations(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const userId = req.user?.id || 'anonymous';
      
      if (!q) {
        return res.status(400).json({
          error: 'Search query required'
        });
      }

      const searchLower = q.toLowerCase();
      
      // Search in conversations and messages
      const matchingConversations = new Set();
      
      // Search conversation titles
      for (const conversation of this.conversations.values()) {
        if (conversation.userId === userId && conversation.isActive) {
          if (conversation.title.toLowerCase().includes(searchLower)) {
            matchingConversations.add(conversation.id);
          }
        }
      }
      
      // Search message content
      for (const message of this.messages.values()) {
        const conversation = this.conversations.get(message.conversationId);
        if (conversation && conversation.userId === userId && conversation.isActive) {
          if (message.content.toLowerCase().includes(searchLower)) {
            matchingConversations.add(message.conversationId);
          }
        }
      }

      const results = Array.from(matchingConversations)
        .map(id => this.conversations.get(id))
        .filter(Boolean)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedResults = results.slice(startIndex, endIndex);

      res.json({
        results: paginatedResults,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.length,
          pages: Math.ceil(results.length / limit)
        },
        query: q
      });

    } catch (error) {
      console.error('Search conversations error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getChatStats(req, res) {
    try {
      const userId = req.user?.id || 'anonymous';
      
      const userConversations = Array.from(this.conversations.values())
        .filter(conv => conv.userId === userId && conv.isActive);
      
      const userMessages = Array.from(this.messages.values())
        .filter(msg => {
          const conversation = this.conversations.get(msg.conversationId);
          return conversation && conversation.userId === userId;
        });

      const totalTokens = userConversations.reduce((sum, conv) => sum + (conv.metadata?.totalTokens || 0), 0);
      const totalCost = userConversations.reduce((sum, conv) => sum + (conv.metadata?.estimatedCost || 0), 0);
      
      const modelUsage = {};
      userConversations.forEach(conv => {
        modelUsage[conv.model] = (modelUsage[conv.model] || 0) + 1;
      });

      res.json({
        stats: {
          totalConversations: userConversations.length,
          totalMessages: userMessages.length,
          totalTokens,
          estimatedCost: totalCost,
          modelUsage,
          averageMessagesPerConversation: userConversations.length > 0 ? 
            Math.round(userMessages.length / userConversations.length) : 0
        }
      });

    } catch (error) {
      console.error('Get chat stats error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Helper functions
  async generateAIResponse(conversation, userMessage) {
    // Simulate AI response generation
    const responses = [
      "I understand your question. Let me help you with that.",
      "That's an interesting point. Here's what I think...",
      "Based on the information provided, I can suggest...",
      "Let me break this down for you step by step.",
      "I'd be happy to help you with this topic."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    return {
      content: randomResponse + " " + userMessage.content.slice(0, 100) + "...",
      metadata: {
        model: conversation.model,
        processingTime: Math.random() * 2000 + 500,
        confidence: Math.random() * 0.3 + 0.7
      },
      cost: Math.random() * 0.01 + 0.001
    };
  }

  estimateTokens(text) {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  formatConversationAsText(conversation, messages) {
    let text = `Conversation: ${conversation.title}\n`;
    text += `Created: ${conversation.createdAt}\n`;
    text += `Model: ${conversation.model}\n\n`;
    
    if (conversation.systemPrompt) {
      text += `System Prompt: ${conversation.systemPrompt}\n\n`;
    }
    
    text += "Messages:\n";
    text += "=".repeat(50) + "\n\n";
    
    messages.forEach(message => {
      const timestamp = new Date(message.createdAt).toLocaleString();
      const role = message.role === 'user' ? 'You' : 'AI';
      text += `[${timestamp}] ${role}:\n${message.content}\n\n`;
    });
    
    return text;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  start() {
    return new Promise((resolve, reject) => {
      // Start HTTP server
      this.server = this.app.listen(this.options.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`💬 Chat Service running on port ${this.options.port}`);
          
          // Start WebSocket server
          this.wsServer.listen(this.options.websocketPort, () => {
            console.log(`🔌 Chat WebSocket running on port ${this.options.websocketPort}`);
            this.emit('started', { 
              httpPort: this.options.port,
              wsPort: this.options.websocketPort
            });
            resolve();
          });
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      const promises = [];
      
      if (this.server) {
        promises.push(new Promise(res => this.server.close(res)));
      }
      
      if (this.wsServer) {
        promises.push(new Promise(res => this.wsServer.close(res)));
      }
      
      Promise.all(promises).then(() => {
        console.log('💬 Chat Service stopped');
        this.emit('stopped');
        resolve();
      });
    });
  }

  getStats() {
    return {
      conversations: this.conversations.size,
      messages: this.messages.size,
      activeConnections: this.activeConnections.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

export default ChatService;