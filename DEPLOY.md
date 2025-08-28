# Deploy no Render - Aithos RAG

## Configuração Rápida

### 1. Deploy da API (Backend)

1. Conecte seu repositório no Render
2. Crie um novo **Web Service**
3. Configure:
   - **Build Command**: `cd api && npm install`
   - **Start Command**: `cd api && npm start`
   - **Environment**: Node.js
   - **Plan**: Free

4. **Variáveis de Ambiente**:
   ```
   NODE_ENV=production
   PORT=10000
   GROQ_API_KEY=sua_chave_groq_aqui
   ```

5. **Health Check Path**: `/api/health`

### 2. Deploy do Frontend

1. Crie um novo **Static Site**
2. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `./dist`

3. **Variáveis de Ambiente**:
   ```
   VITE_API_URL=https://sua-api-url.onrender.com
   ```

## Estrutura de Portas

- **Desenvolvimento**:
  - Frontend: http://localhost:3000
  - API: http://localhost:3005
  - WebSocket HMR: http://localhost:3002

- **Produção (Render)**:
  - API: Porta 10000 (padrão do Render)
  - Frontend: Servido como site estático

## Verificação de Funcionamento

1. **API Health Check**: `https://sua-api-url.onrender.com/api/health`
2. **Frontend**: Deve carregar e conectar com a API automaticamente

## Troubleshooting

- Certifique-se de que a `GROQ_API_KEY` está configurada corretamente
- Verifique se a `VITE_API_URL` aponta para a URL correta da API
- O primeiro deploy pode demorar alguns minutos para "acordar" o serviço gratuito