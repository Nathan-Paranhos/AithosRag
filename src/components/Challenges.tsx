import React from 'react';
import { ArrowRight, Clock, Copy, AlertTriangle, CheckCircle } from 'lucide-react';

const Challenges: React.FC = () => {
  const challenges = [
    {
      icon: <Clock className="h-8 w-8 text-gray-600" />,
      solutionIcon: <CheckCircle className="h-8 w-8 text-blue-600" />,
      problem: "Buscas demoradas",
      solution: "Acesso em segundos com IA avançada",
      color: "from-gray-50 to-gray-100"
    },
    {
      icon: <Copy className="h-8 w-8 text-gray-600" />,
      solutionIcon: <CheckCircle className="h-8 w-8 text-blue-600" />,
      problem: "Duplicação de esforços",
      solution: "Dados centralizados e precisos",
      color: "from-gray-50 to-gray-100"
    },
    {
      icon: <AlertTriangle className="h-8 w-8 text-gray-600" />,
      solutionIcon: <CheckCircle className="h-8 w-8 text-blue-600" />,
      problem: "Inconsistências",
      solution: "Automação para decisões confiáveis",
      color: "from-gray-50 to-gray-100"
    }
  ];

  return (
    <section id="desafios" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Desafios que o <span className="text-blue-600">Aithos RAG</span> Resolve
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transformamos os principais problemas corporativos em oportunidades de crescimento
          </p>
        </div>

        <div className="space-y-8">
          {challenges.map((challenge, index) => (
            <div 
              key={index}
              className={`bg-gradient-to-r ${challenge.color} rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Problem Side */}
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {challenge.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Problema:
                    </h3>
                    <p className="text-lg text-gray-700">
                      {challenge.problem}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <ArrowRight className="h-8 w-8 text-gray-500" />
                </div>

                {/* Solution Side */}
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {challenge.solutionIcon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-blue-600 mb-1">
                      Solução:
                    </h3>
                    <p className="text-lg text-gray-700">
                      {challenge.solution}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Pronto para transformar sua gestão de conhecimento?
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Descubra como o Aithos RAG pode revolucionar a forma como sua empresa acessa e utiliza informações.
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300 transform hover:scale-105">
              Solicitar Demonstração
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Challenges;