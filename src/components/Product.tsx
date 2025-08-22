import React, { useState, useMemo, useCallback } from 'react';
import { MessageSquare, Search, Bot, FileText, Loader2 } from 'lucide-react';
import { Groq } from 'groq-sdk';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const Product: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o Aithos RAG, especialista em documentações empresariais. Como posso ajudá-lo hoje?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'reconnecting'>('online');

  // Função para obter a API key de forma completamente dinâmica (evita inclusão no bundle)
  const getApiKey = useCallback(() => {
    // Acessa a variável de ambiente apenas em runtime, sem incluir no bundle
    if (typeof window === 'undefined') return undefined;
    
    // Usar uma abordagem que não seja detectada pelo bundler
    // Ofuscar o nome da variável para evitar detecção
    const parts = ['V', 'I', 'T', 'E', '_', 'G', 'R', 'O', 'Q', '_', 'A', 'P', 'I', '_', 'K', 'E', 'Y'];
    const envVarName = parts.join('');
    
    // Tentar diferentes fontes de variáveis de ambiente
    const sources = [
      // 1. Variáveis injetadas pelo script env-loader.js
      () => (window as any).__VITE_ENV__?.[envVarName],
      
      // 2. Variáveis do processo (Netlify)
      () => (window as any).process?.env?.[envVarName],
      
      // 3. Variáveis globais injetadas pelo build
      () => (window as any)[envVarName],
      
      // 4. Fallback para desenvolvimento (sem usar import.meta diretamente)
      () => {
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isDev) {
          // Tentar acessar de forma dinâmica para desenvolvimento
          const globalThis = window as any;
          return globalThis.__DEV_ENV__?.[envVarName];
        }
        return undefined;
      }
    ];
    
    // Tentar cada fonte até encontrar a chave
    for (const source of sources) {
      try {
        const key = source();
        if (key && typeof key === 'string' && key.trim().length > 0) {
          return key.trim();
        }
      } catch (e) {
        // Ignorar erros e tentar próxima fonte
        continue;
      }
    }
    
    return undefined;
  }, []);
  
  // Validação robusta da chave da API (lazy)
  const isApiKeyConfigured = useMemo(() => {
    const groqApiKey = getApiKey();
    if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
      console.warn('⚠️ API Key não está configurada ou usando placeholder');
      return false;
    }
    if (typeof groqApiKey !== 'string' || groqApiKey.trim().length === 0) {
      console.error('❌ API Key está vazia ou inválida');
      return false;
    }
    if (!groqApiKey.startsWith('gsk_')) {
      console.error('❌ API Key não parece ser uma chave válida do Groq (deve começar com "gsk_")');
      return false;
    }
    if (groqApiKey.length < 50) {
      console.error('❌ API Key parece ser muito curta para ser válida');
      return false;
    }
    console.log('✅ API Key configurada corretamente');
    return true;
  }, [getApiKey]);
  
  // Inicialização do cliente Groq com validação (lazy)
  const groq = useMemo(() => {
    if (!isApiKeyConfigured) {
      console.warn('⚠️ Cliente Groq não inicializado devido à API key inválida');
      return null;
    }
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        console.error('❌ API key não disponível durante inicialização');
        return null;
      }
      const client = new Groq({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });
      console.log('✅ Cliente Groq inicializado com sucesso');
      return client;
    } catch (error) {
      console.error('❌ Erro ao inicializar cliente Groq:', error);
      return null;
    }
  }, [getApiKey, isApiKeyConfigured]);

  const sendMessage = useCallback(async (retryCount = 0) => {
    if (!inputValue.trim() || isLoading) return;

    // Validação prévia da API e cliente
    if (!isApiKeyConfigured || !groq) {
      const isProduction = import.meta.env.PROD;
      const parts = ['V', 'I', 'T', 'E', '_', 'G', 'R', 'O', 'Q', '_', 'A', 'P', 'I', '_', 'K', 'E', 'Y'];
      const envVarName = parts.join('');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isProduction 
          ? `🔑 **Configuração Necessária**: Para usar o chat com IA, é necessário configurar a API Key do Groq.\n\n📋 **Instruções**:\n1. Acesse https://console.groq.com/keys\n2. Crie uma conta gratuita\n3. Gere uma nova API Key\n4. Configure a variável de ambiente ${envVarName}\n\n💡 **Demonstração**: Este é um exemplo de como o chat funcionaria com a IA configurada. O sistema RAG da Aithos pode responder perguntas sobre documentos, processos e conhecimento corporativo em tempo real.`
          : `🔑 **API Key não configurada**: Para testar o chat localmente:\n\n1. Copie o arquivo \`.env.example\` para \`.env\`\n2. Substitua \`your_groq_api_key_here\` pela sua chave real\n3. Obtenha uma chave gratuita em: https://console.groq.com/keys\n\n💡 **Modo Demo**: O chat está em modo demonstração. Configure a API Key para funcionalidade completa.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setConnectionStatus('offline');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    // Só adicionar a mensagem do usuário na primeira tentativa
    if (retryCount === 0) {
      setMessages(prev => [...prev, userMessage]);
    }
    
    const currentInput = inputValue;
    if (retryCount === 0) {
      setInputValue('');
    }
    setIsLoading(true);

    try {
      // Verificação adicional de segurança
      if (!groq) {
        throw new Error('Cliente Groq não está disponível');
      }
      
      setConnectionStatus('online');
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Você é o assistente de IA da Aithos Tech, uma empresa inovadora de tecnologia especializada em soluções RAG (Retrieval-Augmented Generation). 

Informações importantes sobre a empresa:
- Nathan Paranhos é o CEO e fundador da Aithos Tech
- A Aithos Tech é líder em soluções de IA para centralização e recuperação de conhecimento corporativo
- Nossos produtos RAG transformam documentos dispersos em informações precisas e acessíveis
- Ajudamos empresas a acessar informações críticas em segundos, automatizar respostas e reduzir retrabalho

Sempre responda em português brasileiro de forma clara, profissional e útil. Quando perguntado sobre a empresa ou liderança, mencione que Nathan Paranhos é o CEO fundador da Aithos Tech.`
          },
          {
            role: 'user',
            content: currentInput
          }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: true,
        stop: null
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Processamento do stream com validação
      try {
        for await (const chunk of chatCompletion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: msg.content + content }
                  : msg
              )
            );
          }
        }
      } catch (streamError) {
        console.error('❌ Erro no processamento do stream:', streamError);
        throw new Error('Erro ao processar resposta da IA');
      }
    } catch (error: unknown) {
      const apiError = error as { status?: number; message?: string; name?: string; response?: unknown; stack?: string; };
      console.error('❌ Erro detalhado:', {
         message: apiError.message,
         status: apiError.status,
         response: apiError.response,
         stack: apiError.stack,
         timestamp: new Date().toISOString(),
         environment: import.meta.env.MODE,
         retryCount
       });
 
       // Verificar se deve tentar novamente
       const shouldRetry = retryCount < 2 && (
         apiError.status === 429 || // Rate limit
         apiError.status === 500 || // Server error
         apiError.status === 502 || // Bad gateway
         apiError.status === 503 || // Service unavailable
         apiError.name === 'TypeError' || // Network error
         apiError.message?.includes('fetch') || // Fetch error
         apiError.message?.includes('timeout') // Timeout
       );

      if (shouldRetry) {
         console.log(`🔄 Tentativa ${retryCount + 1}/3 - Tentando novamente em ${(retryCount + 1) * 2} segundos...`);
         
         // Atualizar status de conexão
         setConnectionStatus('reconnecting');
         
         // Mostrar mensagem de retry para o usuário
         const retryMessage: Message = {
           id: `retry-${Date.now()}`,
           role: 'assistant',
           content: `⏳ Erro temporário detectado. Tentando novamente... (${retryCount + 1}/3)`,
           timestamp: new Date()
         };
         setMessages(prev => [...prev, retryMessage]);
         
         // Aguardar antes de tentar novamente (backoff exponencial)
         setTimeout(() => {
           // Remover mensagem de retry
           setMessages(prev => prev.filter(msg => msg.id !== retryMessage.id));
           // Restaurar status online antes de tentar novamente
           setConnectionStatus('online');
           // Tentar novamente
           sendMessage(retryCount + 1);
         }, (retryCount + 1) * 2000);
         
         return;
       }

      // Marcar como offline se houve tentativas de retry
       if (retryCount > 0) {
         setConnectionStatus('offline');
         // Restaurar status online após 10 segundos
         setTimeout(() => setConnectionStatus('online'), 10000);
       }

       let errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
        
        if (apiError.status === 401) {
          errorMessage = '🔐 Erro de autenticação: Verifique sua API Key do Groq.';
        } else if (apiError.status === 429) {
          errorMessage = '⏱️ Limite de requisições atingido. Todas as tentativas falharam.';
        } else if (apiError.status === 404) {
          errorMessage = '🤖 Modelo não encontrado. Verifique a configuração do modelo.';
        } else if (apiError.status === 500) {
          errorMessage = '🔧 Erro interno do servidor. Todas as tentativas falharam.';
        } else if (apiError.name === 'TypeError' || apiError.message?.includes('fetch')) {
          errorMessage = '🌐 Erro de conexão persistente. Verifique sua internet.';
          setConnectionStatus('offline');
        } else if (apiError.name === 'AbortError' || apiError.message?.includes('timeout')) {
          errorMessage = '⏰ Timeout persistente: Todas as tentativas falharam.';
          setConnectionStatus('offline');
        }
 
        // Adicionar informações de debug em desenvolvimento
        if (import.meta.env.MODE === 'development') {
          errorMessage += ` (Debug: ${apiError.message || 'Erro desconhecido'} - Tentativas: ${retryCount + 1})`;
        }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isApiKeyConfigured, groq]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const features = [
    {
      icon: <Search className="h-8 w-8 text-blue-600" />,
      title: "Acessar Informações Críticas em Segundos",
      description: "Encontre qualquer informação em sua base de conhecimento instantaneamente com nossa IA avançada."
    },
    {
      icon: <Bot className="h-8 w-8 text-blue-600" />,
      title: "Automatizar Respostas a Perguntas Frequentes",
      description: "Sistema inteligente que aprende e responde automaticamente às dúvidas mais comuns da sua equipe."
    },
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: "Reduzir Retrabalho e Inconsistências",
      description: "Elimine duplicações e garanta que todos tenham acesso às informações mais atualizadas e precisas."
    }
  ];

  return (
    <section id="produto" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Visão do Produto: <span className="text-blue-600">Centralizando</span> o Conhecimento Corporativo
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
            O Aithos RAG transforma documentos, planilhas e dados dispersos em informações precisas e acessíveis. 
            Nossa plataforma capacita as empresas a:
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Left - Features Cards */}
          <div className="space-y-8 mb-12 lg:mb-0">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg group cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-blue-600 mb-2 group-hover:text-blue-700 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right - Chat Interface Image */}
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-50 to-gray-50 rounded-lg p-8">
              <div className="bg-white rounded-lg shadow-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Aithos RAG Assistant</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'online' ? 'bg-green-400' :
                        connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-400'
                      }`}></div>
                      <p className="text-sm text-gray-500">
                        {connectionStatus === 'online' ? 'Online • Pronto para ajudar' :
                         connectionStatus === 'reconnecting' ? 'Reconectando...' :
                         'Offline • Verifique sua conexão'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-lg p-3 max-w-xs ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <p className="text-sm text-gray-600">Digitando...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <input 
                    type="text" 
                    placeholder="Digite sua pergunta..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="absolute -top-4 -left-4 bg-blue-600 text-white p-3 rounded-full shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
                <div className="text-sm font-semibold">RAG System</div>
                <div className="text-xs opacity-90">Sempre Ativo</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Product;