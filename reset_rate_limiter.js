import fetch from 'node-fetch';

// Script para resetar o rate limiter temporariamente
async function resetRateLimiter() {
  console.log('🔄 Tentando resetar rate limiter...');
  
  const backendUrl = 'http://localhost:3001';
  
  try {
    // Primeiro, vamos verificar o status atual do rate limiter
    console.log('\n1️⃣ Verificando status atual do rate limiter...');
    
    const statusResponse = await fetch(`${backendUrl}/api/ratelimit/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rate-Limiter-Reset/1.0'
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status do rate limiter obtido:');
      console.log(JSON.stringify(statusData, null, 2));
    } else {
      console.log('⚠️ Não foi possível obter status do rate limiter:', statusResponse.status);
    }
    
    // Tentar resetar usando endpoint de reset (se existir)
    console.log('\n2️⃣ Tentando resetar contadores...');
    
    const resetResponse = await fetch(`${backendUrl}/api/ratelimit/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rate-Limiter-Reset/1.0'
      },
      body: JSON.stringify({ action: 'reset_all' })
    });
    
    if (resetResponse.ok) {
      const resetData = await resetResponse.json();
      console.log('✅ Rate limiter resetado com sucesso!');
      console.log(JSON.stringify(resetData, null, 2));
      return true;
    } else {
      console.log('⚠️ Endpoint de reset não disponível:', resetResponse.status);
      
      // Tentar método alternativo - aguardar tempo suficiente
      console.log('\n3️⃣ Aguardando tempo de reset automático...');
      console.log('⏳ Aguardando 65 segundos para reset automático...');
      
      // Aguardar 65 segundos (mais que o retryAfter de 60 segundos)
      for (let i = 65; i > 0; i--) {
        process.stdout.write(`\r⏳ Aguardando: ${i}s restantes...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('\n✅ Tempo de espera concluído!');
      return true;
    }
  } catch (error) {
    console.log('❌ Erro ao resetar rate limiter:', error.message);
    
    // Mesmo com erro, vamos aguardar o tempo de reset
    console.log('\n⏳ Aguardando tempo de reset automático como fallback...');
    console.log('⏳ Aguardando 65 segundos...');
    
    for (let i = 65; i > 0; i--) {
      process.stdout.write(`\r⏳ Aguardando: ${i}s restantes...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ Tempo de espera concluído!');
    return true;
  }
}

// Executar reset
resetRateLimiter()
  .then(success => {
    if (success) {
      console.log('\n🎯 Rate limiter resetado! Agora você pode executar os testes.');
      console.log('💡 Execute: node test_chat_integration.js');
    } else {
      console.log('\n❌ Falha ao resetar rate limiter.');
    }
  })
  .catch(console.error);