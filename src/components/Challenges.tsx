import React from 'react';
import { ArrowRight, Clock, Copy, AlertTriangle, CheckCircle } from 'lucide-react';

const Challenges: React.FC = () => {
  const challenges = [
    {
      icon: <Clock className="h-8 w-8 text-primary-400" />,
      solutionIcon: <CheckCircle className="h-8 w-8 text-primary-300" />,
      problem: "Buscas demoradas",
      solution: "Acesso em segundos com IA avançada",
      bgColor: "bg-primary-500/20"
    },
    {
      icon: <Copy className="h-8 w-8 text-primary-400" />,
      solutionIcon: <CheckCircle className="h-8 w-8 text-primary-300" />,
      problem: "Duplicação de esforços",
      solution: "Dados centralizados e precisos",
      bgColor: "bg-primary-500/20"
    },
    {
      icon: <AlertTriangle className="h-8 w-8 text-primary-400" />,
      solutionIcon: <CheckCircle className="h-8 w-8 text-primary-300" />,
      problem: "Inconsistências",
      solution: "Automação para decisões confiáveis",
      bgColor: "bg-primary-500/20"
    }
  ];

  return (
    <section id="desafios" className="py-24 bg-brand-dark-blue relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-primary-500/10"></div>
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-white mb-8">
            Desafios que o <span className="text-brand-main-blue">Aithos RAG</span> Resolve
          </h2>
          <p className="text-xl text-primary-200/80 max-w-3xl mx-auto">
            Transformamos os principais problemas corporativos em oportunidades de crescimento
          </p>
        </div>

        <div className="space-y-8">
          {challenges.map((challenge, index) => (
            <div 
              key={index}
              className="relative group bg-white/10 backdrop-blur-xl rounded-3xl border border-primary-400/30 p-10 hover:bg-white/15 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/25"
            >
              <div className={`absolute inset-0 ${challenge.bgColor} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              <div className="relative z-10 flex items-center justify-between flex-wrap gap-8">
                {/* Problem Side */}
                <div className="flex items-center space-x-6 flex-1">
                  <div className="flex-shrink-0 p-4 bg-primary-500/20 rounded-2xl border border-primary-400/30">
                    {challenge.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-primary-300 mb-2">
                      Problema:
                    </h3>
                    <p className="text-lg text-white/90">
                      {challenge.problem}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 p-3 bg-brand-main-blue rounded-full">
                  <ArrowRight className="h-8 w-8 text-white" />
                </div>

                {/* Solution Side */}
                <div className="flex items-center space-x-6 flex-1">
                  <div className="flex-shrink-0 p-4 bg-primary-400/20 rounded-2xl border border-primary-300/30">
                    {challenge.solutionIcon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-primary-200 mb-2">
                      Solução:
                    </h3>
                    <p className="text-lg text-white/90">
                      {challenge.solution}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-20">
          <div className="relative group bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-primary-400/30 hover:bg-white/15 transition-all duration-500">
            <div className="absolute inset-0 bg-primary-500/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <h3 className="text-4xl font-bold text-white mb-6">
                Pronto para transformar sua gestão de conhecimento?
              </h3>
              <p className="text-xl text-primary-200/80 mb-8 max-w-2xl mx-auto">
                Descubra como o Aithos RAG pode revolucionar a forma como sua empresa acessa e utiliza informações.
              </p>
              <button className="relative group bg-brand-main-blue text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-brand-hover-blue hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300 transform hover:scale-105">
                <span className="absolute inset-0 bg-brand-main-blue rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity"></span>
                <span className="relative">Solicitar Demonstração</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Challenges;