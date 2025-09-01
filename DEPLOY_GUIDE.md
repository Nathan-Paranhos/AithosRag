# Guia de Deploy - Aithos RAG System

## Resumo dos Testes

### ✅ Frontend - APROVADO
- Interface funcionando perfeitamente
- Build de produção passa
- Testes automatizados OK
- PWA configurado
- Sistema de temas funcionando
- Responsividade validada

### ⚠️ Backend - CÓDIGO PRONTO
- Estrutura completa implementada
- Dependências configuradas
- Documentação Swagger
- Sistema de segurança
- Integração Groq implementada
- *Teste local impedido por problemas técnicos do ambiente*

## Deploy da API

### Repositório: https://github.com/Nathan-Paranhos/api-aithos.git

#### Passos para Deploy:

1. **Preparar repositório**
```bash
# Navegar para a pasta da API
cd api

# Inicializar git (se necessário)
git init
git remote add origin https://github.com/Nathan-Paranhos/api-aithos.git
```

2. **Arquivos essenciais incluídos:**
- ✅ `server.js` - Servidor principal
- ✅ `package.json` - Dependências e scripts
- ✅ `README.md` - Documentação completa
- ✅ `vercel.json` - Configuração de deploy
- ✅ `swagger.js` - Documentação da API
- ✅ Todas as pastas de serviços e middleware

3. **Variáveis de ambiente necessárias:**
```env
GROQ_API_KEY=sua_chave_groq_aqui
NODE_ENV=production
PORT=3005
```

4. **Deploy no Vercel:**
- Conectar repositório ao Vercel
- Configurar variáveis de ambiente
- Deploy automático

5. **Comandos Git:**
```bash
git add .
git commit -m "Initial API deployment"
git push -u origin main
```

## Deploy do Frontend

### Repositório: https://github.com/Nathan-Paranhos/AithosRag

#### Passos para Deploy:

1. **Preparar repositório**
```bash
# Na raiz do projeto
git init
git remote add origin https://github.com/Nathan-Paranhos/AithosRag.git
```

2. **Arquivos essenciais incluídos:**
- ✅ `src/` - Código fonte completo
- ✅ `package.json` - Dependências e scripts
- ✅ `README.md` - Documentação completa
- ✅ `vercel.json` - Configuração de deploy
- ✅ `vite.config.ts` - Configuração do Vite
- ✅ `tailwind.config.js` - Configuração do Tailwind
- ✅ `tsconfig.json` - Configuração TypeScript

3. **Variáveis de ambiente necessárias:**
```env
VITE_API_URL=https://sua-api-url.vercel.app
VITE_APP_NAME=Aithos RAG
VITE_APP_VERSION=1.0.0
```

4. **Deploy no Vercel:**
- Conectar repositório ao Vercel
- Configurar variáveis de ambiente
- Deploy automático

5. **Comandos Git:**
```bash
git add .
git commit -m "Initial frontend deployment"
git push -u origin main
```

## Ordem Recomendada de Deploy

### 1. Deploy da API primeiro
- Fazer deploy da API
- Anotar a URL gerada (ex: https://api-aithos.vercel.app)
- Testar endpoints básicos

### 2. Deploy do Frontend
- Configurar `VITE_API_URL` com a URL da API
- Fazer deploy do frontend
- Testar integração completa

## Configurações Pós-Deploy

### API (Vercel)
1. **Variáveis de Ambiente:**
   - `GROQ_API_KEY`: Chave da API Groq
   - `NODE_ENV`: production
   - `PORT`: 3005

2. **Domínio Personalizado (opcional):**
   - Configurar domínio customizado
   - Certificado SSL automático

### Frontend (Vercel)
1. **Variáveis de Ambiente:**
   - `VITE_API_URL`: URL da API deployada
   - `VITE_APP_NAME`: Aithos RAG
   - `VITE_APP_VERSION`: 1.0.0

2. **PWA:**
   - Service Worker ativo
   - Instalável como app

## Testes Pós-Deploy

### API
- [ ] GET /health - Status da API
- [ ] GET /api-docs - Documentação Swagger
- [ ] POST /api/chat - Endpoint principal
- [ ] GET /api/metrics - Métricas do sistema

### Frontend
- [ ] Carregamento da página
- [ ] Conectividade com API
- [ ] Funcionalidade de chat
- [ ] Alternância de temas
- [ ] Responsividade
- [ ] PWA (instalação)

## Monitoramento

### Logs
- Vercel Dashboard para logs
- Métricas de performance
- Error tracking

### Alertas
- Configurar alertas de uptime
- Monitoramento de erros
- Métricas de uso

## Rollback

Em caso de problemas:
1. Vercel permite rollback instantâneo
2. Cada deploy gera uma URL única
3. Possível reverter para versão anterior

## Suporte

- **Documentação**: README.md em cada repositório
- **API Docs**: /api-docs endpoint
- **Logs**: Vercel Dashboard
- **Issues**: GitHub Issues nos repositórios

---

## Status Final

✅ **Frontend**: Totalmente testado e pronto para deploy
✅ **Backend**: Código completo e estruturado, pronto para deploy
✅ **Documentação**: Completa para ambos os projetos
✅ **Configurações**: Vercel.json configurado
✅ **READMEs**: Documentação detalhada criada

**Próximo passo**: Executar os comandos Git para fazer push dos códigos para os repositórios especificados.