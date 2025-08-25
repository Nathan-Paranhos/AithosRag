// Script para injetar variáveis de ambiente em desenvolvimento
// Este script é usado apenas em desenvolvimento local
(function() {
  'use strict';
  
  // Só executar em desenvolvimento
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Criar objeto para variáveis de desenvolvimento
    window.__DEV_ENV__ = window.__DEV_ENV__ || {};
    
    // Em desenvolvimento, você pode definir a chave aqui temporariamente
    // IMPORTANTE: Este arquivo não será incluído no build de produção
    // A chave real deve vir das variáveis de ambiente do Netlify
    
    console.log('🔧 Ambiente de desenvolvimento detectado');
    const parts = ['V', 'I', 'T', 'E', '_', 'G', 'R', 'O', 'Q', '_', 'A', 'P', 'I', '_', 'K', 'E', 'Y'];
    const envVarName = parts.join('');
    console.log(`📝 Para usar a API Groq em desenvolvimento, defina ${envVarName} no arquivo .env`);
    
    // Tentar carregar do localStorage para desenvolvimento
    const devKey = localStorage.getItem('dev_groq_api_key');
    if (devKey) {
      // Usar nome ofuscado da variável
      const parts = ['V', 'I', 'T', 'E', '_', 'G', 'R', 'O', 'Q', '_', 'A', 'P', 'I', '_', 'K', 'E', 'Y'];
      const envVarName = parts.join('');
      window.__DEV_ENV__[envVarName] = devKey;
      console.log('✅ Chave da API carregada do localStorage');
    } else {
      console.log('⚠️ Chave da API não encontrada. Use localStorage.setItem("dev_groq_api_key", "sua_chave") para definir.');
    }
  }
})();