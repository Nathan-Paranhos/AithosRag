import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-3 group">
      <div className="relative">
        {/* Ícone principal com gradiente e efeitos */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/25">
          {/* Cérebro Simples e Elegante */}
          <div className="relative w-8 h-8">
            {/* Contorno principal do cérebro */}
            <div className="absolute inset-0.5 border-2 border-white/90 rounded-full">
              {/* Divisão central */}
              <div className="absolute top-0 left-1/2 w-px h-full bg-white/60 transform -translate-x-px"></div>
              
              {/* Pontos neurais */}
              <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-white rounded-full animate-pulse opacity-80"></div>
              <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-white rounded-full animate-pulse opacity-80" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute bottom-1.5 left-1.5 w-1 h-1 bg-white rounded-full animate-pulse opacity-80" style={{animationDelay: '1s'}}></div>
              <div className="absolute bottom-1.5 right-1.5 w-1 h-1 bg-white rounded-full animate-pulse opacity-80" style={{animationDelay: '1.5s'}}></div>
            </div>
          </div>
          
          {/* Efeito de brilho */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-xl"></div>
        </div>
        
        {/* Pontos conectores externos */}
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-40"></div>
        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-40"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      <div className="flex flex-col">
        {/* Texto principal com gradiente */}
        <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-blue-900 bg-clip-text text-transparent tracking-tight">
          Aithos
        </span>
        {/* Subtítulo com efeito */}
        <span className="text-sm text-blue-600 font-semibold -mt-1 tracking-widest relative">
          TECH
          {/* Linha de dados */}
          <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-blue-600 via-blue-400 to-transparent opacity-60"></div>
        </span>
      </div>
    </div>
  );
};

export default Logo;