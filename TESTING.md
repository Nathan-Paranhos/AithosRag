# Testes Automatizados - Aithos RAG

## 🧪 Testes da API Groq

Este projeto inclui testes automatizados completos para verificar o funcionamento da API Groq.

### Scripts Disponíveis

```bash
# Executar todos os testes da API Groq
npm run test:groq

# Executar testes em modo watch (desenvolvimento)
npm run test:watch

# Validar se a API key está configurada
npm run env:validate

# Verificar testes + build (pré-deploy)
npm run deploy:check

# Configurar ambiente Netlify automaticamente
npm run netlify:setup
```

### Testes Implementados

✅ **Conectividade da API**
- Verifica se a API Groq está acessível
- Testa autenticação com a chave fornecida

✅ **Resposta do Modelo**
- Testa se o modelo responde corretamente
- Verifica formato e conteúdo da resposta

✅ **Streaming**
- Testa funcionalidade de streaming em tempo real
- Verifica se os chunks são recebidos corretamente

✅ **Configurações Personalizadas**
- Testa parâmetros como temperatura e max_tokens
- Verifica se as configurações são aplicadas

✅ **Ferramentas (Tools)**
- Testa suporte a code_interpreter
- Testa suporte a browser_search

## 🚀 Configuração Automática do Netlify

### Detecção Automática da API Key

O sistema detecta automaticamente a `VITE_GROQ_API_KEY` de:

1. **Arquivo .env local**
2. **Variáveis de ambiente do sistema**
3. **Configuração do Netlify**
4. **Configuração do Vercel**

### Arquivos Gerados

- `netlify.toml` - Configuração completa do Netlify
- `deploy.sh` - Script de deploy automatizado

### Configuração do netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  VITE_GROQ_API_KEY = "sua_chave_aqui"
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## 🔧 Solução de Problemas

### API Key não encontrada
```bash
# Verificar se o arquivo .env existe
ls -la .env

# Validar configuração
npm run env:validate
```

### Testes falhando
```bash
# Executar testes com mais detalhes
npm run test:groq -- --reporter spec

# Verificar conectividade
curl -H "Authorization: Bearer $VITE_GROQ_API_KEY" https://api.groq.com/openai/v1/models
```

### Deploy no Netlify
```bash
# Configurar automaticamente
npm run netlify:setup

# Verificar antes do deploy
npm run deploy:check
```

## 📊 Resultados dos Testes

Quando todos os testes passam, você verá:

```
  Groq API Tests
    Conectividade da API
      ✔ deve conectar com a API Groq
    Resposta do Modelo
      ✔ deve receber resposta válida do modelo
    Streaming
      ✔ deve suportar streaming de resposta
    Configurações do Modelo
      ✔ deve aceitar parâmetros personalizados
    Ferramentas
      ✔ deve suportar code_interpreter e browser_search

  5 passing
```

## 🎯 Próximos Passos

1. Execute `npm run deploy:check` antes de cada deploy
2. Use `npm run netlify:setup` para configurar o Netlify
3. Monitore os testes com `npm run test:watch` durante desenvolvimento
4. Valide a configuração com `npm run env:validate`