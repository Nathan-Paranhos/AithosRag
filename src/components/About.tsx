import React from 'react';
import { Shield, TrendingUp, Sparkles } from 'lucide-react';

const About: React.FC = () => {
  const pillars = [
    {
      icon: <Sparkles className="h-12 w-12 text-white" />,
      title: "Inovação",
      description: "Explorando tecnologias de ponta para manter clientes à frente da concorrência com soluções revolucionárias.",
      bgColor: "bg-primary-500",
      borderColor: "border-primary-400/30"
    },
    {
      icon: <Shield className="h-12 w-12 text-white" />,
      title: "Confiabilidade",
      description: "Sistemas robustos e seguros que garantem máxima integridade e proteção dos seus dados corporativos.",
      bgColor: "bg-brand-main-blue",
      borderColor: "border-primary-400/30"
    },
    {
      icon: <TrendingUp className="h-12 w-12 text-white" />,
      title: "Escalabilidade",
      description: "Arquiteturas flexíveis que evoluem dinamicamente com o crescimento da sua organização.",
      bgColor: "bg-primary-600",
      borderColor: "border-primary-400/30"
    }
  ];

  return (
    <section id="sobre" className="relative py-24 overflow-hidden">
      {/* Background with solid colors */}
      <div className="absolute inset-0 bg-brand-dark-blue">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
      </div>
      
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/6 w-72 h-72 bg-primary-500/12 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/6 w-96 h-96 bg-accent-purple/12 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-emerald/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary-500/20 text-primary-200 border border-primary-400/30 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Tecnologia de Ponta
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-white">
            Sobre a Aithos Tech
          </h2>
          <p className="text-xl text-primary-100/90 max-w-4xl mx-auto leading-relaxed">
            Somos pioneiros em soluções de inteligência artificial que revolucionam a gestão de conhecimento corporativo. 
            Nossa missão é transformar dados complexos em insights estratégicos através de tecnologia RAG avançada.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {pillars.map((pillar, index) => (
            <div 
              key={index}
              className="group relative"
            >
              {/* Glassmorphism card */}
              <div className={`relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border ${pillar.borderColor} shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105`}>
                {/* Floating solid orb */}
                <div className={`absolute -top-4 -right-4 w-16 h-16 ${pillar.bgColor} rounded-2xl opacity-80 animate-pulse group-hover:animate-bounce`}></div>
                
                {/* Icon container */}
                <div className="relative mb-8">
                  <div className={`w-20 h-20 ${pillar.bgColor} rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    {pillar.icon}
                  </div>
                  <div className={`absolute inset-0 ${pillar.bgColor} rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300`}></div>
                </div>
                
                {/* Content */}
                <div className="text-center relative z-10">
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-primary-200 transition-colors duration-300">
                    {pillar.title}
                  </h3>
                  <p className="text-primary-100/85 leading-relaxed group-hover:text-primary-50 transition-colors duration-300">
                    {pillar.description}
                  </p>
                </div>
                
                {/* Bottom accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${pillar.bgColor} rounded-b-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300`}></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stats section */}
        <div className="mt-20 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/25 hover:bg-white/12 transition-all duration-300">
              <div className="text-3xl font-bold text-white mb-2">500+</div>
              <div className="text-primary-100/80">Projetos Entregues</div>
            </div>
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/25 hover:bg-white/12 transition-all duration-300">
              <div className="text-3xl font-bold text-white mb-2">99.9%</div>
              <div className="text-primary-100/80">Uptime Garantido</div>
            </div>
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/25 hover:bg-white/12 transition-all duration-300">
              <div className="text-3xl font-bold text-white mb-2">50+</div>
              <div className="text-primary-100/80">Clientes Ativos</div>
            </div>
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/25 hover:bg-white/12 transition-all duration-300">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-primary-100/80">Suporte Técnico</div>
            </div>
          </div>
          
          {/* Aithos Tech Branding */}
          <div className="mt-12">
            <p className="text-sm text-primary-100/60">Developer by Aithos Tech - Transformando o futuro com IA</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;