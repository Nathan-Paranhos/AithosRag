import React from 'react';
import { Search, Bot, FileText } from 'lucide-react';
import OptimizedChat from './OptimizedChat';

const Product: React.FC = () => {
  const features = [
    {
      icon: <Search className="h-8 w-8 text-primary-400" />,
      title: "Acessar Informações Críticas em Segundos",
      description: "Encontre qualquer informação em sua base de conhecimento instantaneamente com nossa IA avançada."
    },
    {
      icon: <Bot className="h-8 w-8 text-primary-400" />,
      title: "Automatizar Respostas a Perguntas Frequentes",
      description: "Sistema inteligente que aprende e responde automaticamente às dúvidas mais comuns da sua equipe."
    },
    {
      icon: <FileText className="h-8 w-8 text-primary-400" />,
      title: "Reduzir Retrabalho e Inconsistências",
      description: "Elimine duplicações e garanta que todos tenham acesso às informações mais atualizadas e precisas."
    }
  ];

  return (
    <section id="produto" className="py-24 bg-brand-dark-blue relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-primary-500/5"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/15 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/15 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-white mb-8">
            Visão do Produto: <span className="text-brand-main-blue">Centralizando</span> o Conhecimento Corporativo
          </h2>
          <p className="text-xl text-primary-100/90 max-w-4xl mx-auto leading-relaxed mb-8">
            O Aithos RAG transforma documentos, planilhas e dados dispersos em informações precisas e acessíveis. 
            Nossa plataforma capacita as empresas a:
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Left - Features Cards */}
          <div className="space-y-8 mb-12 lg:mb-0">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="relative group bg-white/8 backdrop-blur-xl rounded-2xl p-8 border border-primary-400/20 hover:bg-white/12 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/20 cursor-pointer"
              >
                <div className="absolute inset-0 bg-primary-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-start space-x-6">
                  <div className="flex-shrink-0 p-3 bg-brand-main-blue rounded-xl group-hover:scale-110 transition-transform duration-300">
                    {React.cloneElement(feature.icon, { className: "h-8 w-8 text-white" })}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-primary-300 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-primary-100/85 leading-relaxed text-lg">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right - Optimized Chat Interface */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-10 border border-primary-400/30 shadow-2xl">
              <OptimizedChat />
              
              <div className="absolute -top-6 -left-6 bg-brand-main-blue text-white p-4 rounded-2xl shadow-2xl">
                <Bot className="h-8 w-8" />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-primary-600 text-white p-6 rounded-2xl shadow-2xl">
                <div className="text-lg font-bold">RAG System</div>
                <div className="text-sm opacity-90 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Sempre Ativo
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Product;