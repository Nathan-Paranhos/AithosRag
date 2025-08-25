#!/bin/bash
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
