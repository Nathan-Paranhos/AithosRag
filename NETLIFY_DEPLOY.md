# 🚀 Guia de Deploy no Netlify - Aithos RAG

## ✅ Status do Projeto
- ✅ Aplicação testada localmente (desenvolvimento e produção)
- ✅ Build funcionando corretamente
- ✅ Variáveis de ambiente configuradas localmente
- ✅ Arquivo .env no .gitignore (não será enviado para o GitHub)
- ✅ netlify.toml configurado corretamente

## 🔧 Configuração no Netlify

### 1. Deploy Inicial
1. Acesse [Netlify](https://netlify.com) e faça login
2. Clique em "New site from Git"
3. Conecte seu repositório GitHub
4. Selecione o repositório `Aithos-RAG`
5. Configure as opções de build:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `20`

### 2. ⚠️ IMPORTANTE: Configurar Variável de Ambiente

**Antes do primeiro deploy funcionar completamente, você DEVE configurar a API key:**

1. No painel do Netlify, vá para **Site settings**
2. Clique em **Environment variables** (no menu lateral)
3. Clique em **Add a variable**
4. Configure:
   - **Key**: `VITE_GROQ_API_KEY`
   - **Value**: `sua_chave_groq_api_aqui`
   - **Scopes**: Marque "Production" e "Deploy previews"
5. Clique em **Create variable**

### 3. Redeploy
Após configurar a variável de ambiente:
1. Vá para **Deploys**
2. Clique em **Trigger deploy** → **Deploy site**
3. Aguarde o build completar

## 🧪 Teste do Deploy

Após o deploy:
1. Acesse a URL do seu site no Netlify
2. Navegue até a seção "Produto" 
3. Teste o chat com IA:
   - Digite uma pergunta como "Quem é o CEO da Aithos Tech?"
   - Verifique se a resposta é gerada corretamente
   - O status deve mostrar "online" (bolinha verde)

## 🔍 Solução de Problemas

### Chat não funciona (mostra mensagem de configuração)
- ✅ Verifique se a variável `VITE_GROQ_API_KEY` foi configurada no Netlify
- ✅ Confirme se o valor da API key está correto
- ✅ Faça um novo deploy após configurar a variável

### Build falha
- ✅ Verifique se o Node.js está na versão 20
- ✅ Confirme se o comando de build está correto: `npm run build`
- ✅ Verifique se o diretório de publicação está correto: `dist`

### Erro 404 em rotas
- ✅ O netlify.toml já está configurado para SPA routing
- ✅ Se persistir, adicione `/*    /index.html   200` no arquivo `_redirects`

## 📋 Checklist Final

- [ ] Site deployado no Netlify
- [ ] Variável `VITE_GROQ_API_KEY` configurada
- [ ] Chat funcionando corretamente
- [ ] Todas as páginas carregando
- [ ] Design responsivo funcionando
- [ ] Animações e efeitos visuais ativos

## 🎯 Próximos Passos

1. **Domínio Personalizado**: Configure um domínio próprio nas configurações do Netlify
2. **Analytics**: Ative o Netlify Analytics para monitorar o tráfego
3. **Forms**: Configure formulários de contato se necessário
4. **Performance**: Use o Lighthouse para otimizar a performance

---

**✨ Seu projeto Aithos RAG está pronto para produção!**

Em caso de dúvidas, consulte a [documentação oficial do Netlify](https://docs.netlify.com/).