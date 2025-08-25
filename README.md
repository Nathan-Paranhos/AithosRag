# Aithos RAG - Sistema de Recuperação Aumentada por Geração

🚀 **Plataforma inovadora de IA que transforma documentos dispersos em informações precisas e acessíveis**

Desenvolvido pela **Aithos Tech**, liderada pelo CEO Nathan Paranhos, especialista em soluções RAG (Retrieval-Augmented Generation) para centralização e recuperação de conhecimento corporativo.

## ✨ Funcionalidades

- 🔍 **Acesso instantâneo** a informações críticas em segundos
- 🤖 **Automação de respostas** a perguntas frequentes
- 📄 **Redução de retrabalho** e inconsistências
- 💬 **Chat inteligente** com IA treinada
- 🎨 **Interface moderna** com animações de partículas responsivas

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **IA**: Groq API (Llama 3)
- **Animações**: Canvas + SVG
- **Deploy**: Netlify

## 🚀 Configuração e Instalação

### 1. Clone o repositório
```bash
git clone <repository-url>
cd Aithos-RAG
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente

#### Para desenvolvimento local:
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env e substitua os valores
```

#### Configuração da API Groq:
1. Acesse [Groq Console](https://console.groq.com/keys)
2. Crie uma conta gratuita
3. Gere uma nova API Key
4. Substitua `your_groq_api_key_here` no arquivo `.env`:

```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

### 4. Execute o projeto
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 🌐 Deploy no Netlify

### Configuração de Variáveis de Ambiente

1. **No painel do Netlify**:
   - Vá para `Site settings` > `Environment variables`
   - Adicione: `VITE_GROQ_API_KEY` = `sua_chave_groq_aqui`

2. **Configuração automática**:
   - O projeto está configurado para deploy automático
   - O build command: `npm run build`
   - Publish directory: `dist`

### Resolução de Problemas de Deploy

#### Erro de "Secrets Scanning"
Se você receber erro sobre secrets detectados:

1. ✅ **Já resolvido**: A chave da API foi removida do código
2. ✅ **Já configurado**: Arquivo `.env` está no `.gitignore`
3. ✅ **Fallback implementado**: O app funciona sem a API key

#### Configuração de Variáveis no Netlify
```bash
# No painel do Netlify, adicione:
VITE_GROQ_API_KEY=your_groq_api_key_here
```

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview da build
npm run check        # Verificação de tipos TypeScript
```

## 📁 Estrutura do Projeto

```
Aithos-RAG/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Hero.tsx        # Seção principal
│   │   ├── Product.tsx     # Chat com IA
│   │   └── ParticleCanvas.tsx # Animações
│   ├── hooks/              # Hooks customizados
│   ├── styles/             # Estilos CSS
│   └── utils/              # Utilitários
├── .env.example            # Exemplo de variáveis
├── .gitignore             # Arquivos ignorados
└── README.md              # Este arquivo
```

## 🔒 Segurança

- ✅ API Keys não são expostas no código
- ✅ Variáveis de ambiente configuradas corretamente
- ✅ Fallback seguro quando API não disponível
- ✅ Validação robusta de configurações

## 🎯 Modo Demonstração

O projeto funciona em modo demonstração mesmo sem a API Key configurada:
- Interface completa disponível
- Animações de partículas funcionais
- Mensagens informativas sobre configuração
- Instruções claras para ativação completa

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Contato

**Aithos Tech** - Soluções em IA e RAG  
**CEO**: Nathan Paranhos  
**Especialidade**: Centralização e recuperação de conhecimento corporativo

---

⚡ **Transforme documentos dispersos em informações precisas e acessíveis com Aithos RAG!**