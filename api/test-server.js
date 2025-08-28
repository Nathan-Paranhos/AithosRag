import express from 'express';
import healthMonitor from './middleware/healthMonitor.js';

const app = express();
const PORT = 3006;

// Configurar healthMonitor com serviços básicos
console.log('🔧 Configurando healthMonitor...');

try {
  // Adicionar serviços de teste
  healthMonitor.addService('auth-service', {
    url: 'http://localhost:3001/health',
    timeout: 5000
  });
  
  healthMonitor.addService('chat-service', {
    url: 'http://localhost:3002/health', 
    timeout: 5000
  });
  
  console.log('✅ Serviços adicionados ao healthMonitor');
  
  // Verificar se os serviços foram adicionados corretamente
  console.log('📋 HealthMonitor configurado com sucesso');
  console.log('🔗 Serviços adicionados: auth-service, chat-service');
  
} catch (error) {
  console.error('❌ Erro ao configurar healthMonitor:', error);
}

// Rota básica de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌟 Servidor de teste rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  
  // Testar health check após 3 segundos
  setTimeout(async () => {
    console.log('🔍 Testando health checks...');
    try {
      const results = await healthMonitor.performHealthCheck();
      console.log('📊 Resultados dos health checks:', results);
    } catch (error) {
      console.error('❌ Erro no health check:', error);
    }
  }, 3000);
});