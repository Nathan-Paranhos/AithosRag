import React from 'react';
import { Shield, TrendingUp, Sparkles } from 'lucide-react';

const About: React.FC = () => {
  const pillars = [
    {
      icon: <Sparkles className="h-12 w-12 text-blue-600" />,
      title: "Inovação",
      description: "Explorando tecnologias de ponta para manter clientes à frente."
    },
    {
      icon: <Shield className="h-12 w-12 text-blue-600" />,
      title: "Confiabilidade",
      description: "Sistemas robustos e seguros para garantir integridade de dados."
    },
    {
      icon: <TrendingUp className="h-12 w-12 text-blue-600" />,
      title: "Escalabilidade",
      description: "Soluções que crescem com as necessidades da sua empresa."
    }
  ];

  return (
    <section id="sobre" className="py-20 bg-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Sobre a Aithos Tech
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            A Aithos Tech é líder no fornecimento de soluções tecnológicas inteligentes que 
            transformam dados brutos em informações estratégicas e valiosas. Nosso foco principal 
            reside em três pilares: Inovação, Confiabilidade e Escalabilidade.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
            >
              <div className="flex justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                {pillar.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {pillar.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;