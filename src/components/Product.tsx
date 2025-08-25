import React from 'react';
import { Search, Bot, FileText } from 'lucide-react';
import OptimizedChat from './OptimizedChat';

const Product: React.FC = () => {
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

          {/* Right - Optimized Chat Interface */}
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-50 to-gray-50 rounded-lg p-8">
              <OptimizedChat />
              
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