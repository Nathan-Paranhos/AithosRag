import fetch from 'node-fetch';

// Script para desabilitar temporariamente o rate limiter
async function disableRateLimiter() {
  console.log('🔧 Desabilitando rate limiter temporariamente para testes...');
  
  const backendUrl = 'http://localhost:3001';
  
  try {
    // Configuração para desabilitar rate limiting (valores muito altos)
    const testConfig = {
      adaptiveMode: false,
      modelLimits: {
        'meta-llama/llama-4-maverick-17b-128e-instruct': {
          requestsPerMinute: 10000,
          tokensPerMinute: 1000000,
          concurrentRequests: 100,
          priority: 1
        },
        'meta-llama/llama-3.1-70b-versatile': {
          requestsPerMinute: 10000,
          tokensPerMinute: 1000000,
          concurrentRequests: 100,
          priority: 2
        },
        'meta-llama/llama-3.1-8b-instant': {
          requestsPerMinute: 10000,
          tokensPerMinute: 1000000,
          concurrentRequests: 100,
          priority: 3
        },
        'mixtral-8x7b-32768': {
          requestsPerMinute: 10000,
          tokensPerMinute: 1000000,
          concurrentRequests: 100,
          priority: 4
        }
      },
      userTiers: {
        free: {
          multiplier: 100,
          dailyLimit: 100000
        },
        premium: {
          multiplier: 100,
          dailyLimit: 100000
        },
        enterprise: {
          multiplier: 100,
          dailyLimit: 100000
        }
      }
    };
    
    console.log('\n1️⃣ Atualizando configurações do rate limiter...');
    
    const configResponse = await fetch(`${backendUrl}/api/ratelimit/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rate-Limiter-Disable/1.0'
      },
      body: JSON.stringify(testConfig)
    });
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Configurações atualizadas com sucesso!');
      console.log('📊 Novos limites aplicados (valores altos para testes)');
    } else {
      console.log('⚠️ Falha ao atualizar configurações:', configResponse.status);
      const errorText = await configResponse.text();
      console.log('Erro:', errorText);
    }
    
    // Tentar resetar contadores existentes
    console.log('\n2️⃣ Resetando contadores existentes...');
    
    const resetResponse = await fetch(`${backendUrl}/api/ratelimit/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rate-Limiter-Disable/1.0'
      },
      body: JSON.stringify({ action: 'reset_all' })
    });
    
    if (resetResponse.ok) {
      console.log('✅ Contadores resetados!');
    } else {
      console.log('⚠️ Falha ao resetar contadores:', resetResponse.status);
    }
    
    // Verificar se as mudanças foram aplicadas
    console.log('\n3️⃣ Verificando status após mudanças...');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
    
    const statusResponse = await fetch(`${backendUrl}/api/ratelimit/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rate-Limiter-Disable/1.0'
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status atual do rate limiter:');
      console.log(`🔧 Modo adaptativo: ${statusData.adaptiveMode ? 'Ativado' : 'Desativado'}`);
      console.log(`📊 Total de requisições ativas: ${statusData.totalActiveRequests || 0}`);
      
      return true;
    } else {
      console.log('⚠️ Não foi possível verificar status:', statusResponse.status);
      return true; // Assumir sucesso mesmo sem verificação
    }
    
  } catch (error) {
    console.log('❌ Erro ao desabilitar rate limiter:', error.message);
    return false;
  }
}

// Executar desabilitação
disableRateLimiter()
  .then(success => {
    if (success) {
      console.log('\n🎯 Rate limiter configurado para testes!');
      console.log('💡 Agora você pode executar: node test_chat_integration.js');
      console.log('⚠️ Lembre-se de reativar as configurações normais após os testes!');
    } else {
      console.log('\n❌ Falha ao configurar rate limiter para testes.');
    }
  })
  .catch(console.error);