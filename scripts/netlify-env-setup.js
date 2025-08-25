/**
 * Script para configuração automática de variáveis de ambiente no Netlify
 * Detecta automaticamente a VITE_GROQ_API_KEY e configura o deploy
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para detectar chave API do Groq
function detectGroqApiKey() {
  const possibleSources = [
    // Arquivo .env local
    () => {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/VITE_GROQ_API_KEY=(.+)/);
        return match ? match[1].trim() : null;
      }
      return null;
    },
    
    // Variável de ambiente do sistema
    () => process.env.VITE_GROQ_API_KEY,
    
    // Netlify environment variables
    () => process.env.NETLIFY_GROQ_API_KEY,
    
    // Vercel environment variables
    () => process.env.VERCEL_GROQ_API_KEY
  ];
  
  for (const source of possibleSources) {
    const key = source();
    if (key && key.startsWith('gsk_')) {
      return key;
    }
  }
  
  return null;
}

// Função para validar chave API
function validateApiKey(key) {
  if (!key) return false;
  if (!key.startsWith('gsk_')) return false;
  if (key.length < 50) return false;
  return true;
}

// Função para criar arquivo de configuração do Netlify
function createNetlifyConfig(apiKey) {
  const netlifyToml = `
# Configuração automática do Netlify para AithosRAG
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  VITE_GROQ_API_KEY = "${apiKey}"
  NODE_VERSION = "20"

# Redirecionamentos para SPA
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers de segurança
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`;
  
  fs.writeFileSync(path.join(process.cwd(), 'netlify.toml'), netlifyToml);
  console.log('✅ netlify.toml criado com configurações automáticas');
}

// Função para criar script de deploy
function createDeployScript() {
  const deployScript = `#!/bin/bash
# Script de deploy automático para Netlify

echo "🚀 Iniciando deploy automático..."

# Detectar chave API
echo "🔍 Detectando chave API Groq..."
node scripts/netlify-env-setup.js

# Build do projeto
echo "🏗️ Fazendo build do projeto..."
npm run build

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
  echo "✅ Build concluído com sucesso!"
  echo "📦 Arquivos prontos para deploy em ./dist"
else
  echo "❌ Erro no build!"
  exit 1
fi

echo "🎉 Deploy pronto!"
`;
  
  fs.writeFileSync(path.join(process.cwd(), 'deploy.sh'), deployScript);
  fs.chmodSync(path.join(process.cwd(), 'deploy.sh'), '755');
  console.log('✅ Script de deploy criado');
}

// Função principal
function main() {
  console.log('🔧 Configurando ambiente para Netlify...');
  
  const apiKey = detectGroqApiKey();
  
  if (!apiKey) {
    console.error('❌ Chave API Groq não encontrada!');
    console.log('💡 Adicione VITE_GROQ_API_KEY no painel do Netlify ou no arquivo .env');
    process.exit(1);
  }
  
  if (!validateApiKey(apiKey)) {
    console.error('❌ Chave API Groq inválida!');
    console.log('💡 Verifique se a chave começa com "gsk_" e tem o formato correto');
    process.exit(1);
  }
  
  console.log('✅ Chave API Groq detectada e validada');
  console.log(`🔑 Chave: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`);
  
  // Criar configurações
  createNetlifyConfig(apiKey);
  createDeployScript();
  
  console.log('🎉 Configuração automática concluída!');
  console.log('📋 Próximos passos:');
  console.log('   1. Faça commit das alterações');
  console.log('   2. Conecte o repositório ao Netlify');
  console.log('   3. O deploy será automático!');
}

// Executar se chamado diretamente
if (process.argv[1] && process.argv[1].includes('netlify-env-setup.js')) {
    main().catch(console.error);
}

export {
    detectGroqApiKey,
    validateApiKey,
    createNetlifyConfig,
    main
};

export default {
    detectGroqApiKey,
    validateApiKey,
    createNetlifyConfig,
    main
};