# Aithos RAG API

## Descrição
API backend para o sistema Aithos RAG, construída com Node.js, Express e integração com Groq AI.

## Funcionalidades
- ✅ Sistema de chat com IA (Groq)
- ✅ Gerenciamento de sessões
- ✅ Sistema de métricas e monitoramento
- ✅ Cache inteligente
- ✅ Rate limiting e segurança
- ✅ Documentação Swagger
- ✅ Sistema de fallback
- ✅ WebSocket para comunicação em tempo real

## Tecnologias
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **IA**: Groq API
- **Documentação**: Swagger/OpenAPI
- **Segurança**: Helmet, CORS, Rate Limiting
- **Monitoramento**: Sistema de métricas customizado

## Instalação

### Pré-requisitos
- Node.js 20 ou superior
- npm ou yarn
- Chave da API Groq

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/Nathan-Paranhos/api-aithos.git
cd api-aithos
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
GROQ_API_KEY=sua_chave_groq_aqui
PORT=3005
NODE_ENV=production
```

4. **Inicie o servidor**
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## Endpoints Principais

### Health Check
```
GET /health
```
Retorna o status da API.

### Chat
```
POST /api/chat
```
Envia mensagem para a IA e recebe resposta.

### Métricas
```
GET /api/metrics
```
Retorna métricas do sistema.

### Documentação
```
GET /api-docs
```
Documentação Swagger da API.

## Estrutura do Projeto

```
api/
├── server.js              # Servidor principal
├── package.json           # Dependências e scripts
├── .env                   # Variáveis de ambiente
├── swagger.js             # Configuração Swagger
├── services/              # Serviços da aplicação
│   ├── groq.service.js    # Integração com Groq
│   └── ...
├── middleware/            # Middlewares customizados
├── routes/                # Rotas da API
├── microservices/         # Microserviços
└── utils/                 # Utilitários
```

## Deploy

### Vercel (Recomendado)
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Heroku
1. Crie um app no Heroku
2. Configure as variáveis de ambiente
3. Faça o deploy via Git

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3005
CMD ["npm", "start"]
```

## Configuração de Produção

### Variáveis de Ambiente Obrigatórias
- `GROQ_API_KEY`: Chave da API Groq
- `PORT`: Porta do servidor (padrão: 3005)
- `NODE_ENV`: Ambiente (production/development)

### Variáveis Opcionais
- `RATE_LIMIT_WINDOW`: Janela de rate limiting (padrão: 15min)
- `RATE_LIMIT_MAX`: Máximo de requests por janela (padrão: 100)
- `CACHE_TTL`: TTL do cache em segundos (padrão: 300)

## Monitoramento

A API inclui:
- ✅ Health checks automáticos
- ✅ Métricas de performance
- ✅ Logs estruturados
- ✅ Rate limiting
- ✅ Error tracking

## Segurança

- ✅ CORS configurado
- ✅ Helmet para headers de segurança
- ✅ Rate limiting
- ✅ Validação de entrada
- ✅ Sanitização de dados

## Suporte

Para suporte ou dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação Swagger
- Verifique os logs da aplicação

## Licença

MIT License - veja o arquivo LICENSE para detalhes.