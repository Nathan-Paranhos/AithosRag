import express from 'express';
import { GroqAdvancedService } from '../services/groqAdvancedService.js';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Garantir que dotenv está carregado
dotenv.config();

const router = express.Router();
const groqService = new GroqAdvancedService();

// Rate limiting para endpoints Groq
const groqRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições para a API Groq. Tente novamente em 15 minutos.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de validação para chat
const validateChatRequest = [
  body('messages')
    .isArray({ min: 1 })
    .withMessage('Messages deve ser um array com pelo menos 1 mensagem'),
  body('messages.*.role')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Role deve ser user, assistant ou system'),
  body('messages.*.content')
    .isString()
    .isLength({ min: 1, max: 32000 })
    .withMessage('Content deve ser uma string entre 1 e 32000 caracteres'),
  body('config.temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature deve estar entre 0 e 2'),
  body('config.max_completion_tokens')
    .optional()
    .isInt({ min: 1, max: 65536 })
    .withMessage('max_completion_tokens deve estar entre 1 e 65536'),
  body('config.top_p')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('top_p deve estar entre 0 e 1')
];

/**
 * @swagger
 * /api/groq/chat:
 *   post:
 *     summary: Cria uma conversa com o modelo GPT-OSS-120B
 *     tags: [Groq Advanced]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     content:
 *                       type: string
 *               config:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 2
 *                   max_completion_tokens:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 65536
 *                   top_p:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                   reasoning_effort:
 *                     type: string
 *                     enum: [low, medium, high]
 *     responses:
 *       200:
 *         description: Resposta gerada com sucesso
 *       400:
 *         description: Dados de entrada inválidos
 *       429:
 *         description: Rate limit excedido
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/chat', groqRateLimit, validateChatRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { messages, config = {} } = req.body;
    const streamId = uuidv4();

    // Validação adicional de configuração
    const configErrors = groqService.validateConfig(config);
    if (configErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: configErrors
      });
    }

    const result = await groqService.createChatCompletion(messages, config, streamId);

    res.json({
      success: true,
      data: {
        streamId,
        content: result.content,
        metrics: result.metrics
      }
    });
  } catch (error) {
    console.error('Erro no chat Groq:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/groq/stream:
 *   post:
 *     summary: Inicia uma conversa com streaming em tempo real
 *     tags: [Groq Advanced]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     content:
 *                       type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Stream iniciado com sucesso
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post('/stream', groqRateLimit, validateChatRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { messages, config = {} } = req.body;
    const streamId = uuidv4();

    // Configurar SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Enviar ID do stream
    res.write(`data: ${JSON.stringify({ type: 'stream_started', streamId })}\n\n`);

    // Configurar listeners para eventos do stream
    const onChunk = (data) => {
      if (data.streamId === streamId) {
        res.write(`data: ${JSON.stringify({ 
          type: 'chunk', 
          content: data.content,
          fullContent: data.fullContent 
        })}\n\n`);
      }
    };

    const onCompleted = (data) => {
      if (data.streamId === streamId) {
        res.write(`data: ${JSON.stringify({ 
          type: 'completed', 
          content: data.fullContent,
          metrics: data.metrics 
        })}\n\n`);
        res.end();
        cleanup();
      }
    };

    const onError = (data) => {
      if (data.streamId === streamId) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: data.error 
        })}\n\n`);
        res.end();
        cleanup();
      }
    };

    const cleanup = () => {
      groqService.off('chat:chunk', onChunk);
      groqService.off('chat:completed', onCompleted);
      groqService.off('chat:error', onError);
    };

    // Registrar listeners
    groqService.on('chat:chunk', onChunk);
    groqService.on('chat:completed', onCompleted);
    groqService.on('chat:error', onError);

    // Cleanup quando cliente desconecta
    req.on('close', () => {
      groqService.cancelStream(streamId);
      cleanup();
    });

    // Iniciar chat
    groqService.createChatCompletion(messages, { ...config, stream: true }, streamId)
      .catch(error => {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: error.message 
        })}\n\n`);
        res.end();
        cleanup();
      });

  } catch (error) {
    console.error('Erro no stream Groq:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/groq/metrics:
 *   get:
 *     summary: Obtém métricas de uso da API Groq
 *     tags: [Groq Advanced]
 *     responses:
 *       200:
 *         description: Métricas obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = groqService.getMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/groq/config:
 *   get:
 *     summary: Obtém configurações disponíveis
 *     tags: [Groq Advanced]
 *     responses:
 *       200:
 *         description: Configurações obtidas com sucesso
 */
router.get('/config', (req, res) => {
  try {
    const config = groqService.getAvailableConfigs();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/groq/test:
 *   get:
 *     summary: Testa conectividade com a API Groq
 *     tags: [Groq Advanced]
 *     responses:
 *       200:
 *         description: Teste realizado com sucesso
 */
router.get('/test', async (req, res) => {
  try {
    const result = await groqService.testConnection();
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Erro no teste de conectividade:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota de teste do GPT-OSS-120B
router.get('/test-gpt-oss', async (req, res) => {
  try {
    const result = await groqService.testGptOss120b();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      data: { 
        success: false, 
        error: error.message 
      } 
    });
  }
});

// Rota de teste de streaming com tools
router.post('/test-streaming-tools', async (req, res) => {
  try {
    const { messages } = req.body;
    const streamId = `test-${Date.now()}`;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }
    
    const result = await groqService.testStreamingWithTools(messages, streamId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      data: { 
        success: false, 
        error: error.message 
      } 
    });
  }
});

// Rota para obter modelos disponíveis
router.get('/models', async (req, res) => {
  try {
    const models = groqService.getAvailableModels();
    res.json({ success: true, data: models });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Rota para chat com modelo específico
router.post('/chat-with-model', async (req, res) => {
  try {
    const { messages, model, config = {} } = req.body;
    const streamId = `chat-${Date.now()}`;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }
    
    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }
    
    const result = await groqService.createChatCompletionWithModel(messages, model, config, streamId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Rota para teste com fallback automático
router.post('/test-fallback', async (req, res) => {
  try {
    const { messages } = req.body;
    const streamId = `fallback-test-${Date.now()}`;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }
    
    // Forçar uso do GPT-OSS-120B para testar fallback
    const result = await groqService.createChatCompletion(messages, {
      model: 'openai/gpt-oss-120b',
      stream: false
    }, streamId);
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/groq/cancel/{streamId}:
 *   delete:
 *     summary: Cancela um stream ativo
 *     tags: [Groq Advanced]
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stream cancelado com sucesso
 *       404:
 *         description: Stream não encontrado
 */
router.delete('/cancel/:streamId', (req, res) => {
  try {
    const { streamId } = req.params;
    const cancelled = groqService.cancelStream(streamId);
    
    if (cancelled) {
      res.json({
        success: true,
        message: 'Stream cancelado com sucesso'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Stream não encontrado'
      });
    }
  } catch (error) {
    console.error('Erro ao cancelar stream:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;