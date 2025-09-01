import React, { useState } from 'react';
import { Menu, X, Code } from 'lucide-react';
import ConnectionIndicator from './ConnectionIndicator';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const navItems = [
    { name: 'Sobre', href: 'sobre' },
    { name: 'Produto', href: 'produto' },
    { name: 'Desafios', href: 'desafios' },
    { name: 'Contato', href: 'contato' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo e Branding */}
          <div className="flex-shrink-0">
            <div className="flex flex-col">
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <Code className="h-6 w-6 text-brand-main-blue" />
                Aithos <span className="text-brand-main-blue">RAG</span>
              </div>
              <div className="text-xs text-primary-300 font-medium tracking-wide">
                Developer by Aithos Tech
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-6">
              <div className="flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => scrollToSection(item.href)}
                    className="text-primary-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-white/10"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              
              {/* Connection Indicator */}
              <ConnectionIndicator variant="compact" className="ml-4" />
            </div>
          </div>

          {/* CTA Button */}
          <button 
            onClick={() => scrollToSection('produto')}
            className="hidden md:block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Experimente Gratuitamente
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white p-2 transition-colors"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-brand-dark-blue/95 backdrop-blur-sm">
            {/* Connection Status Mobile */}
            <div className="px-3 py-2 mb-2">
              <ConnectionIndicator variant="compact" />
            </div>
            
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  scrollToSection(item.href);
                  setIsMenuOpen(false);
                }}
                className="text-primary-100 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors duration-200 hover:bg-white/10"
              >
                {item.name}
              </button>
            ))}
            <div className="pt-4 border-t border-primary-400/20">
              <button className="bg-brand-main-blue hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 w-full">
                Experimente Grátis
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;