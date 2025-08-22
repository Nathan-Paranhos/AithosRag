// Script para carregar variáveis de ambiente em runtime
// Este script é carregado antes do bundle principal e injeta as variáveis no window
(function() {
  'use strict';
  
  // Função para carregar variáveis de ambiente do servidor
  function loadEnvironmentVariables() {
    // Em produção (Netlify), as variáveis vêm do processo de build
    if (typeof window !== 'undefined') {
      window.__VITE_ENV__ = window.__VITE_ENV__ || {};
      
      // Tentar carregar de diferentes fontes
      const sources = [
        // Netlify injeta variáveis no processo de build
        () => {
          const script = document.querySelector('script[data-env]');
          if (script) {
            try {
              return JSON.parse(script.getAttribute('data-env') || '{}');
            } catch (e) {
              console.warn('Erro ao parsear variáveis de ambiente:', e);
              return {};
            }
          }
          return {};
        },
        
        // Fallback para desenvolvimento
        () => {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Em desenvolvimento, pode usar import.meta.env como fallback
            return {}; // Será tratado no componente
          }
          return {};
        }
      ];
      
      // Tentar cada fonte
      for (const source of sources) {
        try {
          const env = source();
          if (env && Object.keys(env).length > 0) {
            Object.assign(window.__VITE_ENV__, env);
            break;
          }
        } catch (e) {
          console.warn('Erro ao carregar variáveis de ambiente:', e);
        }
      }
      
      console.log('✅ Variáveis de ambiente carregadas em runtime');
    }
  }
  
  // Carregar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEnvironmentVariables);
  } else {
    loadEnvironmentVariables();
  }
})();