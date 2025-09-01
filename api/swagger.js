import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Aithos RAG API',
      version: '1.0.0',
      description: 'API backend para Aithos RAG Assistant com integração Groq - Developer by Aithos Tech',
      contact: {
        name: 'Aithos Tech',
        url: 'https://github.com/Nathan-Paranhos/api-aithos',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desenvolvimento',
      },
      {
        url: 'https://api-aithos.vercel.app',
        description: 'Servidor de produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro',
            },
            message: {
              type: 'string',
              description: 'Detalhes do erro',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp do erro',
            },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded'],
              description: 'Status geral do sistema',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp da verificação',
            },
            uptime: {
              type: 'number',
              description: 'Tempo de atividade em segundos',
            },
            version: {
              type: 'string',
              description: 'Versão da API',
            },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['user', 'assistant', 'system'],
              description: 'Papel da mensagem no chat',
            },
            content: {
              type: 'string',
              description: 'Conteúdo da mensagem',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp da mensagem',
            },
          },
          required: ['role', 'content'],
        },
        ChatRequest: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensagem do usuário',
              example: 'Olá, como você pode me ajudar?',
            },
            model: {
              type: 'string',
              description: 'Modelo de IA a ser usado',
              example: 'llama3-8b-8192',
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              description: 'Temperatura para controle de criatividade',
              example: 0.7,
            },
            max_tokens: {
              type: 'integer',
              minimum: 1,
              maximum: 8192,
              description: 'Número máximo de tokens na resposta',
              example: 1000,
            },
          },
          required: ['message'],
        },
        ChatResponse: {
          type: 'object',
          properties: {
            response: {
              type: 'string',
              description: 'Resposta da IA',
            },
            model: {
              type: 'string',
              description: 'Modelo usado para gerar a resposta',
            },
            usage: {
              type: 'object',
              properties: {
                prompt_tokens: {
                  type: 'integer',
                  description: 'Tokens usados no prompt',
                },
                completion_tokens: {
                  type: 'integer',
                  description: 'Tokens usados na resposta',
                },
                total_tokens: {
                  type: 'integer',
                  description: 'Total de tokens usados',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp da resposta',
            },
          },
        },
        Metrics: {
          type: 'object',
          properties: {
            requests: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: 'Total de requisições',
                },
                successful: {
                  type: 'integer',
                  description: 'Requisições bem-sucedidas',
                },
                failed: {
                  type: 'integer',
                  description: 'Requisições falhadas',
                },
              },
            },
            performance: {
              type: 'object',
              properties: {
                average_response_time: {
                  type: 'number',
                  description: 'Tempo médio de resposta em ms',
                },
                uptime: {
                  type: 'number',
                  description: 'Tempo de atividade em segundos',
                },
              },
            },
            models: {
              type: 'object',
              description: 'Estatísticas por modelo de IA',
            },
          },
        },
      },
    },
  },
  apis: ['./server.js', './routes/*.js', './services/*.js'], // Caminhos para os arquivos com anotações JSDoc
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi };