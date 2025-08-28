import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Configurar dotenv
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT) || 3005;

// Configurar CORS
const corsOptions = {
  origin: ['http://localhost:5176', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Validate endpoint
app.get('/api/validate', (req, res) => {
  const hasApiKey = !!process.env.GROQ_API_KEY;
  res.json({ 
    valid: hasApiKey,
    message: hasApiKey ? 'API Key configured' : 'API Key missing'
  });
});

// Models endpoint
app.get('/api/chat/models', (req, res) => {
  res.json({
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' }
    ]
  });
});

// Basic chat endpoint
app.post('/api/chat/completions', (req, res) => {
  res.json({
    id: 'test-response',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: req.body.model || 'llama-3.1-70b-versatile',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'Esta é uma resposta de teste do servidor backend simplificado.'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 15,
      total_tokens: 25
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});