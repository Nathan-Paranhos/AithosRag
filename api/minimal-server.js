const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3005;

// Middleware básico
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Aithos RAG API'
  });
});

// Chat endpoint básico
app.post('/api/chat', (req, res) => {
  res.json({
    message: 'API funcionando - endpoint de chat disponível',
    timestamp: new Date().toISOString(),
    received: req.body
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
});

// Tratamento de erros
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});