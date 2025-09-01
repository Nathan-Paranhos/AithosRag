# Aithos RAG Frontend

## Descrição
Interface frontend para o sistema Aithos RAG, construída com React, TypeScript, Vite e Tailwind CSS.

## Funcionalidades
- ✅ Interface de chat moderna e responsiva
- ✅ Sistema de temas (claro/escuro)
- ✅ PWA (Progressive Web App)
- ✅ Sistema de retry automático
- ✅ Gerenciamento de estado com Zustand
- ✅ Componentes reutilizáveis
- ✅ Hooks customizados
- ✅ Conectividade inteligente com backend
- ✅ Notificações toast
- ✅ Design system consistente

## Tecnologias
- **Framework**: React 18
- **Build Tool**: Vite
- **Linguagem**: TypeScript
- **Styling**: Tailwind CSS
- **Estado**: Zustand
- **Roteamento**: React Router
- **Ícones**: Lucide React
- **Notificações**: Sonner
- **PWA**: Vite PWA Plugin

## Instalação

### Pré-requisitos
- Node.js 18 ou superior
- npm, yarn ou pnpm

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/Nathan-Paranhos/AithosRag.git
cd AithosRag
```

2. **Instale as dependências**
```bash
# Com npm
npm install

# Com yarn
yarn install

# Com pnpm
pnpm install
```

3. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_API_URL=http://localhost:3005
VITE_APP_NAME=Aithos RAG
VITE_APP_VERSION=1.0.0
```

4. **Inicie o servidor de desenvolvimento**
```bash
# Com npm
npm run dev

# Com yarn
yarn dev

# Com pnpm
pnpm dev
```

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Testes
npm run test

# Linting
npm run lint

# Verificação completa (build + testes)
npm run deploy:check
```

## Estrutura do Projeto

```
src/
├── components/           # Componentes reutilizáveis
│   ├── ui/              # Componentes base da UI
│   ├── chat/            # Componentes do chat
│   └── layout/          # Componentes de layout
├── hooks/               # Hooks customizados
├── pages/               # Páginas da aplicação
├── store/               # Gerenciamento de estado
├── utils/               # Funções utilitárias
├── styles/              # Estilos globais
└── types/               # Definições de tipos
```

## Componentes Principais

### Chat Interface
- **ChatContainer**: Container principal do chat
- **MessageList**: Lista de mensagens
- **MessageInput**: Input para novas mensagens
- **TypingIndicator**: Indicador de digitação

### UI Components
- **Button**: Botão customizável
- **Input**: Campo de entrada
- **Card**: Container de conteúdo
- **Toast**: Notificações
- **ThemeToggle**: Alternador de tema

### Hooks Customizados
- **useChat**: Gerenciamento do chat
- **useConnectivity**: Monitoramento de conectividade
- **useTheme**: Gerenciamento de tema
- **useRetry**: Sistema de retry

## Deploy

### Vercel (Recomendado)
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Netlify
1. Conecte o repositório ao Netlify
2. Configure o comando de build: `npm run build`
3. Configure o diretório de publicação: `dist`

### Build Manual
```bash
# Gerar build de produção
npm run build

# Os arquivos estarão na pasta 'dist'
```

## Configuração de Produção

### Variáveis de Ambiente
- `VITE_API_URL`: URL da API backend
- `VITE_APP_NAME`: Nome da aplicação
- `VITE_APP_VERSION`: Versão da aplicação

### Otimizações
- ✅ Code splitting automático
- ✅ Tree shaking
- ✅ Minificação
- ✅ Compressão de assets
- ✅ PWA caching
- ✅ Lazy loading de componentes

## PWA Features

- ✅ Instalável como app nativo
- ✅ Funciona offline (cache básico)
- ✅ Ícones e splash screens
- ✅ Manifest configurado
- ✅ Service Worker

## Temas

O sistema suporta:
- 🌞 **Tema Claro**: Interface clara e limpa
- 🌙 **Tema Escuro**: Interface escura para baixa luminosidade
- 🔄 **Auto**: Segue preferência do sistema

## Responsividade

- 📱 **Mobile**: Otimizado para dispositivos móveis
- 📱 **Tablet**: Layout adaptado para tablets
- 💻 **Desktop**: Interface completa para desktop
- 🖥️ **Large Screens**: Suporte a telas grandes

## Testes

```bash
# Executar testes
npm run test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Suporte

Para suporte ou dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação dos componentes
- Verifique o console do navegador para erros

## Licença

MIT License - veja o arquivo LICENSE para detalhes.