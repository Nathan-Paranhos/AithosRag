import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Sparkles, Code } from 'lucide-react';
import ConnectionIndicator from './ConnectionIndicator';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validação básica
    if (!email || !message) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      alert('Por favor, insira um email válido.');
      return;
    }
    alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    setEmail('');
    setMessage('');
  };

  return (
    <footer id="contato" className="relative bg-brand-dark-blue text-white py-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-primary-500/5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Contact Form Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary-400 mr-3" />
              <h2 className="text-4xl font-bold text-white">
                Entre em Contato
              </h2>
              <Sparkles className="h-8 w-8 text-primary-400 ml-3" />
            </div>
            <p className="text-xl text-primary-200/80 max-w-2xl mx-auto">
              Pronto para revolucionar sua gestão de conhecimento? Fale conosco!
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-primary-200">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-primary-400/30 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 text-white placeholder-primary-300 transition-all duration-300"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2 text-primary-200">
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-primary-400/30 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 text-white placeholder-primary-300 resize-none transition-all duration-300"
                    placeholder="Conte-nos como podemos ajudar..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-brand-main-blue hover:bg-brand-hover-blue px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center space-x-2 text-white"
                >
                  <Send className="h-5 w-5" />
                  <span>Enviar Mensagem</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Content */}
        <div className="border-t border-white/20 pt-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-brand-main-blue p-6 rounded-2xl shadow-2xl">
                <Code className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-4xl font-bold text-white mb-2">
                Aithos <span className="text-brand-main-blue">RAG</span>
              </h3>
              <div className="text-lg text-primary-300 font-medium tracking-wide">
                Developer by Aithos Tech
              </div>
            </div>
            <p className="text-primary-200/80 max-w-2xl mx-auto text-lg mb-6">
              Transformando dados em conhecimento, conhecimento em poder. 
              A Aithos Tech está redefinindo o futuro da gestão de informações corporativas.
            </p>
            
            {/* Connection Status */}
            <div className="flex justify-center">
              <ConnectionIndicator variant="compact" />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="text-center group">
              <div className="flex justify-center mb-4">
                <div className="bg-primary-500 p-4 rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                  <Mail className="h-8 w-8 text-white" />
                </div>
              </div>
              <h4 className="font-semibold mb-2 text-white text-lg">Email</h4>
              <a 
                href="mailto:contato@aithos.tech" 
                className="text-primary-400 hover:text-primary-300 transition-colors duration-300 text-lg"
              >
                contato@aithos.tech
              </a>
            </div>
            <div className="text-center group">
              <div className="flex justify-center mb-4">
                <div className="bg-brand-main-blue p-4 rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                  <Phone className="h-8 w-8 text-white" />
                </div>
              </div>
              <h4 className="font-semibold mb-2 text-white text-lg">Telefone</h4>
              <a 
                href="tel:+5511123456789" 
                className="text-primary-400 hover:text-primary-300 transition-colors duration-300 text-lg"
              >
                +55 11 1234-5678
              </a>
            </div>
            <div className="text-center group">
              <div className="flex justify-center mb-4">
                <div className="bg-primary-600 p-4 rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
              </div>
              <h4 className="font-semibold mb-2 text-white text-lg">Localização</h4>
              <p className="text-primary-200/80 text-lg">São Paulo, Brasil</p>
            </div>
          </div>

          {/* Bottom Links */}
          <div className="border-t border-white/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex space-x-8">
                <a 
                  href="#" 
                  className="text-primary-200/80 hover:text-primary-400 transition-colors duration-300 font-medium"
                >
                  Política de Privacidade
                </a>
                <a 
                  href="#" 
                  className="text-primary-200/80 hover:text-primary-400 transition-colors duration-300 font-medium"
                >
                  Termos de Uso
                </a>
              </div>
              <div className="text-primary-300/60 text-sm font-medium">
                © 2024 Aithos Tech. Todos os direitos reservados.
                <div className="text-xs mt-1 opacity-75">
                  Developer by Aithos Tech - Powered by AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;