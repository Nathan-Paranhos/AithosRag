import { Groq } from 'groq-sdk';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Serviço Avançado Groq GPT-OSS-120B
 * Implementa streaming, tools, configurações dinâmicas e monitoramento
 */
class GroqAdvancedService extends EventEmitter {
  constructor() {
    super();
    
    // Garantir que dotenv está carregado
    dotenv.config();
    
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is missing or empty');
    }
    
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    this.activeStreams = new Map();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0
    };
    
    // EventEmitter para streaming
    this.eventEmitter = new EventEmitter();
    
    // Configurações padrão para GPT-OSS-120B
    this.defaultConfig = {
      model: 'openai/gpt-oss-120b',
      temperature: 1.67,
      max_completion_tokens: 65536,
      top_p: 1,
      stream: true,
      reasoning_effort: 'medium',
      stop: null,
      tools: [
        { type: 'browser_search' },
        { type: 'code_interpreter' }
      ]
    };
    
    // Configuração de fallback
    this.fallbackConfig = {
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_completion_tokens: 4096,
      top_p: 1,
      stream: true,
      stop: null
    };
    
    // Modelos disponíveis
    this.availableModels = {
      'gpt-oss-120b': this.defaultConfig,
      'llama-3.1-8b-instant': this.fallbackConfig,
      'llama-3.1-70b-versatile': {
        model: 'llama-3.1-70b-versatile',
        temperature: 0.8,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: true,
        stop: null
        // Sem tools - modelo não suporta
      }
    };
  }

  /**
   * Cria uma conversa com streaming avançado
   */
  async createChatCompletion(messages, config = {}, streamId = null) {
    const startTime = performance.now();
    this.metrics.totalRequests++;
    
    try {
      const finalConfig = {
        ...this.defaultConfig,
        ...config,
        messages: this.sanitizeMessages(messages)
      };
      
      // Remover tools e reasoning_effort para modelos que não suportam
      if (finalConfig.model && finalConfig.model.includes('llama')) {
        delete finalConfig.tools;
        delete finalConfig.reasoning_effort;
      }

      this.emit('chat:started', { streamId, config: finalConfig });

      // Tentar com o modelo principal primeiro
      let chatCompletion;
      let usedFallback = false;
      
      try {
        chatCompletion = await this.groq.chat.completions.create(finalConfig);
      } catch (primaryError) {
        // Se falhar (rate limit, etc), usar fallback
        if (primaryError.message.includes('429') || primaryError.message.includes('Rate limit')) {
          console.log(`Rate limit reached for ${finalConfig.model}, using fallback model`);
          
          const fallbackConfig = {
            ...this.fallbackConfig,
            stream: finalConfig.stream,
            temperature: config.temperature || this.fallbackConfig.temperature,
            messages: this.sanitizeMessages(messages)
          };
          
          chatCompletion = await this.groq.chat.completions.create(fallbackConfig);
          
          usedFallback = true;
          finalConfig.model = fallbackConfig.model;
        } else {
          throw primaryError;
        }
      }
      
      if (streamId) {
        this.activeStreams.set(streamId, {
          stream: chatCompletion,
          startTime,
          config: finalConfig,
          usedFallback
        });
      }

      if (finalConfig.stream) {
        return this.handleStreamResponse(chatCompletion, streamId, startTime, usedFallback);
      } else {
        // Resposta não-stream
        const content = chatCompletion.choices[0]?.message?.content || '';
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const tokensUsed = chatCompletion.usage?.total_tokens || 0;
        
        this.updateMetrics(responseTime, tokensUsed, true);
        
        return {
          content,
          usedFallback,
          metrics: {
            responseTime,
            tokensUsed,
            model: finalConfig.model,
            reasoning_effort: finalConfig.reasoning_effort,
            tools_used: finalConfig.tools?.length || 0
          },
          raw: chatCompletion
        };
      }
    } catch (error) {
      this.metrics.failedRequests++;
      this.emit('chat:error', { streamId, error: error.message });
      throw new Error(`Groq API Error: ${error.message}`);
    }
  }

  /**
   * Processa resposta em streaming
   */
  async handleStreamResponse(chatCompletion, streamId, startTime, usedFallback = false) {
    const chunks = [];
    let totalTokens = 0;
    let fullContent = '';
    let reasoningContent = '';
    let toolCalls = [];

    try {
      // Verificar se chatCompletion é iterável
      if (chatCompletion && typeof chatCompletion[Symbol.asyncIterator] === 'function') {
        for await (const chunk of chatCompletion) {
          const delta = chunk.choices[0]?.delta;
          const content = delta?.content || '';
          const reasoning = delta?.reasoning || '';
          const toolCall = delta?.tool_calls?.[0];
          const finishReason = chunk.choices[0]?.finish_reason;
          
          if (content) {
            fullContent += content;
            chunks.push({
              content,
              timestamp: Date.now(),
              tokens: chunk.usage?.total_tokens || 0,
              type: 'content'
            });

            this.emit('chat:chunk', {
              streamId,
              content,
              fullContent,
              finishReason,
              type: 'content'
            });
          }
          
          if (reasoning) {
            reasoningContent += reasoning;
            chunks.push({
              content: reasoning,
              timestamp: Date.now(),
              tokens: chunk.usage?.total_tokens || 0,
              type: 'reasoning'
            });
            
            this.emit('chat:chunk', {
              streamId,
              content: reasoning,
              fullContent: reasoningContent,
              type: 'reasoning'
            });
          }
          
          if (toolCall) {
            toolCalls.push(toolCall);
            chunks.push({
              toolCall,
              timestamp: Date.now(),
              tokens: chunk.usage?.total_tokens || 0,
              type: 'tool_call'
            });
            
            this.emit('chat:chunk', {
              streamId,
              toolCall,
              type: 'tool_call'
            });
          }

          if (chunk.usage) {
            totalTokens = chunk.usage.total_tokens;
          }

          if (finishReason) {
            break;
          }
        }
      } else {
        // Fallback para resposta não-stream
        const content = chatCompletion.choices[0]?.message?.content || '';
        fullContent = content;
        totalTokens = chatCompletion.usage?.total_tokens || 0;
        
        chunks.push({
          content,
          timestamp: Date.now(),
          tokens: totalTokens,
          type: 'content'
        });

        this.emit('chat:chunk', {
          streamId,
          content,
          fullContent,
          finishReason: 'stop',
          type: 'content'
        });
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.updateMetrics(responseTime, totalTokens, true);
      
      if (streamId) {
        this.activeStreams.delete(streamId);
      }

      this.emit('chat:completed', {
        streamId,
        fullContent,
        reasoningContent,
        toolCalls,
        chunks,
        responseTime,
        totalTokens,
        usedFallback
      });

      return {
        content: fullContent,
        reasoning: reasoningContent,
        toolCalls,
        chunks,
        usedFallback,
        metrics: {
          responseTime,
          totalTokens,
          chunksCount: chunks.length,
          reasoningTokens: reasoningContent.length,
          toolCallsCount: toolCalls.length
        }
      };
    } catch (error) {
      console.error('Erro no handleStreamResponse:', error);
      this.metrics.failedRequests++;
      this.emit('chat:error', { streamId, error: error.message });
      throw error;
    }
  }

  /**
   * Sanitiza mensagens de entrada
   */
  sanitizeMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' 
        ? msg.content.trim().substring(0, 32000) // Limite de segurança
        : msg.content
    }));
  }

  /**
   * Atualiza métricas de performance
   */
  updateMetrics(responseTime, tokens, success) {
    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.totalTokensUsed += tokens;
      
      // Calcula média móvel do tempo de resposta
      const totalSuccessful = this.metrics.successfulRequests;
      this.metrics.averageResponseTime = 
        ((this.metrics.averageResponseTime * (totalSuccessful - 1)) + responseTime) / totalSuccessful;
    }
  }

  /**
   * Cancela stream ativo
   */
  cancelStream(streamId) {
    if (this.activeStreams.has(streamId)) {
      const streamData = this.activeStreams.get(streamId);
      this.activeStreams.delete(streamId);
      this.emit('chat:cancelled', { streamId });
      return true;
    }
    return false;
  }

  /**
   * Obtém métricas atuais
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeStreams: this.activeStreams.size,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }

  /**
   * Obtém configurações disponíveis
   */
  getAvailableConfigs() {
    return {
      models: [
        'openai/gpt-oss-120b',
        'llama-3.3-70b-versatile',
        'mixtral-8x7b-32768'
      ],
      temperatureRange: { min: 0, max: 2, default: 1.67 },
      maxTokensRange: { min: 1, max: 65536, default: 65536 },
      topPRange: { min: 0, max: 1, default: 1 },
      reasoningEfforts: ['low', 'medium', 'high'],
      availableTools: [
        { type: 'browser_search', description: 'Busca na web em tempo real' },
        { type: 'code_interpreter', description: 'Interpretador de código Python' }
      ]
    };
  }

  /**
   * Valida configuração de entrada
   */
  validateConfig(config) {
    const errors = [];
    
    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature deve estar entre 0 e 2');
      }
    }
    
    if (config.max_completion_tokens !== undefined) {
      if (config.max_completion_tokens < 1 || config.max_completion_tokens > 65536) {
        errors.push('max_completion_tokens deve estar entre 1 e 65536');
      }
    }
    
    if (config.top_p !== undefined) {
      if (config.top_p < 0 || config.top_p > 1) {
        errors.push('top_p deve estar entre 0 e 1');
      }
    }
    
    return errors;
  }

  /**
   * Teste de conectividade
   */
  async testConnection() {
    try {
      const response = await this.groq.chat.completions.create({
        messages: [{
          role: 'user',
          content: 'Hello, this is a test message. Please respond briefly.'
        }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 50,
        stream: false
      });

      return {
        success: true,
        message: 'Groq API connection successful',
        model: 'llama-3.1-8b-instant',
        response: response.choices[0]?.message?.content || 'No response',
        gptOss120bAvailable: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testGptOss120b() {
    try {
      const response = await this.groq.chat.completions.create({
        messages: [{
          role: 'user',
          content: 'Test the GPT-OSS-120B model with reasoning. Explain briefly how you work.'
        }],
        ...this.defaultConfig,
        stream: false,
        max_completion_tokens: 200
      });

      return {
        success: true,
        message: 'GPT-OSS-120B model test successful',
        model: this.defaultConfig.model,
        response: response.choices[0]?.message?.content || 'No response',
        reasoning: response.choices[0]?.message?.reasoning || 'No reasoning provided',
        tools_available: this.defaultConfig.tools,
        reasoning_effort: this.defaultConfig.reasoning_effort,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        model: this.defaultConfig.model
      };
    }
  }

  async testStreamingWithTools(messages, streamId) {
     try {
       const response = await this.createChatCompletion(messages, {
         stream: true,
         reasoning_effort: 'high',
         tools: [
           { type: 'browser_search' },
           { type: 'code_interpreter' }
         ]
       }, streamId);
 
       return {
         success: true,
         message: 'Streaming with tools test initiated',
         streamId,
         response
       };
     } catch (error) {
       return {
         success: false,
         error: error.message,
         streamId
       };
     }
   }

   getAvailableModels() {
     return {
       models: Object.keys(this.availableModels),
       configurations: this.availableModels,
       defaultModel: this.defaultConfig.model,
       fallbackModel: this.fallbackConfig.model,
       features: {
         'gpt-oss-120b': {
           reasoning: true,
           tools: true,
           maxTokens: 65536,
           streaming: true
         },
         'llama-3.1-8b-instant': {
           reasoning: false,
           tools: false,
           maxTokens: 4096,
           streaming: true
         },
         'llama-3.1-70b-versatile': {
           reasoning: false,
           tools: false,
           maxTokens: 8192,
           streaming: true
         }
       }
     };
   }

   async createChatCompletionWithModel(messages, modelName, config = {}, streamId = null) {
     const modelConfig = this.availableModels[modelName];
     if (!modelConfig) {
       throw new Error(`Model ${modelName} not available. Available models: ${Object.keys(this.availableModels).join(', ')}`);
     }

     // Filtrar configurações baseadas no modelo
     const finalConfig = { ...modelConfig, ...config };
     
     // Remover tools e reasoning_effort para modelos llama
     if (modelName.includes('llama')) {
       delete finalConfig.tools;
       delete finalConfig.reasoning_effort;
     }
     
     // Garantir que o modelo correto seja usado
     finalConfig.model = modelConfig.model;

     return this.createChatCompletion(messages, finalConfig, streamId);
   }

  /**
   * Limpa recursos e streams ativos
   */
  cleanup() {
    this.activeStreams.clear();
    this.removeAllListeners();
  }
}

export default GroqAdvancedService;
export { GroqAdvancedService };