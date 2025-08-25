// Script de teste avançado para verificar problemas de produção
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const groq = new Groq({
  apiKey: process.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Simular ambiente de browser
});

async function testProductionIssues() {
  console.log('🔍 Testando problemas específicos do ambiente de produção...');
  console.log('API Key:', process.env.VITE_GROQ_API_KEY ? `${process.env.VITE_GROQ_API_KEY.substring(0, 10)}...` : 'Não configurada');
  console.log('Modelo:', 'llama3-8b-8192');
  
  // Teste 1: Verificar se a API Key é válida
  console.log('\n📋 Teste 1: Validação da API Key');
  try {
    const testCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'teste' }],
      model: 'llama3-8b-8192',
      max_tokens: 10,
    });
    console.log('✅ API Key válida');
  } catch (error) {
    console.error('❌ Problema com API Key:', error.message);
    return;
  }

  // Teste 2: Testar streaming (como usado no frontend)
  console.log('\n📋 Teste 2: Streaming de resposta');
  try {
    const streamCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Você é o assistente de IA da Aithos Tech. Nathan Paranhos é o CEO. Responda em português.'
        },
        {
          role: 'user',
          content: 'oi'
        }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 100,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of streamCompletion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        process.stdout.write(content);
      }
    }
    console.log('\n✅ Streaming funcionando corretamente');
    
  } catch (error) {
    console.error('❌ Erro no streaming:', error.message);
    console.error('Status:', error.status);
    console.error('Detalhes:', error.error);
  }

  // Teste 3: Testar diferentes tipos de erro
  console.log('\n📋 Teste 3: Simulação de erros');
  
  // Teste com modelo inválido
  try {
    await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'teste' }],
      model: 'modelo-inexistente',
      max_tokens: 10,
    });
  } catch (error) {
    console.log('✅ Erro de modelo capturado corretamente:', error.status, error.message);
  }

  console.log('\n🎯 Teste concluído!');
}

testProductionIssues().catch(console.error);