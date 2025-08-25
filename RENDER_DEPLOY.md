# Deploy da API Backend no Render.com

Este guia explica como fazer o deploy da API backend da Aithos RAG no Render.com, resolvendo o problema de autenticação que estava ocorrendo no Netlify.

## 📋 Pré-requisitos

1. **Conta no Render.com**: Crie uma conta gratuita em [render.com](https://render.com)
2. **Repositório GitHub**: Seu código deve estar em um repositório GitHub
3. **API Key do Groq**: Obtenha uma chave gratuita em [console.groq.com](https://console.groq.com/keys)

## 🚀 Passos para Deploy

### 1. Preparar o Repositório

Certifique-se de que os seguintes arquivos estão no seu repositório:

```
aithos-rag/
├── api/
│   ├── package.json
│   ├── server.js
│   ├── groq.service.js
│   ├── routes/
│   │   └── chat.js
│   ├── .env.example
│   ├── Dockerfile
│   └── .dockerignore
├── render.yaml
└── RENDER_DEPLOY.md (este arquivo)
```

### 2. Conectar Repositório no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub
4. Selecione o repositório `aithos-rag`

### 3. Configurar o Serviço

#### Configurações Básicas:
- **Name**: `aithos-rag-api`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Root Directory**: `api`
- **Runtime**: `Node`

#### Comandos de Build e Start:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Configurações Avançadas:
- **Plan**: `Free` (para começar)
- **Node Version**: `18` (ou superior)
- **Auto-Deploy**: `Yes`

### 4. Configurar Variáveis de Ambiente

Na seção **Environment**, adicione as seguintes variáveis:

```bash
# Configuração do Servidor
NODE_ENV=production
PORT=10000

# API Key do Groq (OBRIGATÓRIA)
GROQ_API_KEY=sua_chave_groq_aqui

# Configurações de CORS (opcional)
CORS_ORIGINS=https://seu-frontend.netlify.app,https://aithos-rag.netlify.app

# Configurações de Rate Limiting (opcional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Nível de Log (opcional)
LOG_LEVEL=info
```

**⚠️ IMPORTANTE**: Substitua `sua_chave_groq_aqui` pela sua chave real do Groq!

### 5. Fazer o Deploy

1. Clique em **"Create Web Service"**
2. O Render irá automaticamente:
   - Clonar seu repositório
   - Instalar dependências (`npm install`)
   - Iniciar o servidor (`npm start`)
3. Aguarde o deploy completar (pode levar alguns minutos)

### 6. Verificar o Deploy

Após o deploy, você receberá uma URL como:
```
https://aithos-rag-api.onrender.com
```

Teste os endpoints:

#### Health Check:
```bash
curl https://aithos-rag-api.onrender.com/api/health
```

#### Validar API Key:
```bash
curl https://aithos-rag-api.onrender.com/api/validate
```

#### Testar Chat:
```bash
curl -X POST https://aithos-rag-api.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Olá, como você pode me ajudar?"}
    ]
  }'
```

## 🔧 Configurar Frontend

Após o deploy da API, configure o frontend para usar a nova URL:

### No Netlify (Variáveis de Ambiente):

1. Acesse o painel do Netlify
2. Vá em **Site settings** → **Environment variables**
3. Adicione:
   ```
   VITE_API_URL=https://aithos-rag-api.onrender.com
   ```

### Localmente (arquivo .env):

```bash
# .env
VITE_API_URL=https://aithos-rag-api.onrender.com
```

## 📊 Monitoramento

### Logs do Render:
- Acesse o dashboard do Render
- Clique no seu serviço
- Vá na aba **"Logs"** para ver logs em tempo real

### Métricas:
- **CPU Usage**: Monitore o uso de CPU
- **Memory Usage**: Monitore o uso de memória
- **Response Time**: Monitore a latência das requisições

## 🔒 Segurança

### Variáveis de Ambiente Seguras:
- ✅ **GROQ_API_KEY**: Configurada no Render (não no código)
- ✅ **CORS**: Configurado para aceitar apenas domínios específicos
- ✅ **Rate Limiting**: Proteção contra abuso
- ✅ **Helmet**: Headers de segurança configurados

### Domínios Permitidos:
Por padrão, a API aceita requisições de:
- `localhost` (desenvolvimento)
- `*.netlify.app` (Netlify)
- `*.vercel.app` (Vercel)

## 🚨 Troubleshooting

### Problema: Deploy Falha
**Solução**: Verifique os logs no Render dashboard

### Problema: API Key Inválida
**Solução**: 
1. Verifique se `GROQ_API_KEY` está configurada
2. Teste a chave em [console.groq.com](https://console.groq.com)

### Problema: CORS Error
**Solução**: 
1. Adicione seu domínio frontend em `CORS_ORIGINS`
2. Formato: `https://seu-site.netlify.app`

### Problema: Timeout
**Solução**: 
1. Render Free tier pode ter cold starts
2. Considere upgrade para plano pago para melhor performance

### Problema: 503 Service Unavailable
**Solução**: 
1. Verifique se o serviço está rodando nos logs
2. Reinicie o serviço se necessário

## 💰 Custos

### Plano Free:
- ✅ **750 horas/mês** de runtime
- ✅ **Bandwidth ilimitado**
- ⚠️ **Cold starts** após inatividade
- ⚠️ **Sleep após 15min** de inatividade

### Plano Starter ($7/mês):
- ✅ **Sem cold starts**
- ✅ **Sempre ativo**
- ✅ **Melhor performance**

## 🔄 Atualizações Automáticas

O Render está configurado para auto-deploy:
- ✅ **Push para main**: Deploy automático
- ✅ **Pull requests**: Deploy de preview
- ✅ **Rollback**: Fácil reversão se necessário

## 📞 Suporte

Se encontrar problemas:

1. **Logs do Render**: Primeiro lugar para investigar
2. **Documentação**: [render.com/docs](https://render.com/docs)
3. **Suporte Render**: [render.com/support](https://render.com/support)

---

## ✅ Checklist Final

- [ ] Repositório conectado no Render
- [ ] Variável `GROQ_API_KEY` configurada
- [ ] Deploy realizado com sucesso
- [ ] Health check funcionando
- [ ] API Key validada
- [ ] Frontend configurado com nova URL
- [ ] Chat funcionando end-to-end

**🎉 Parabéns! Sua API backend está rodando no Render.com e o problema de autenticação foi resolvido!**