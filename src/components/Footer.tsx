import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import Logo from './Logo';

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
    <footer id="contato" className="bg-gray-800 text-white py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Contact Form Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Entre em Contato</h2>
            <p className="text-xl text-gray-300">
              Pronto para revolucionar sua gestão de conhecimento? Fale conosco!
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 resize-none"
                  placeholder="Conte-nos como podemos ajudar..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Send className="h-5 w-5" />
                <span>Enviar Mensagem</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer Content */}
        <div className="border-t border-gray-700 pt-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-lg">
                <Logo />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">Desenvolvido por Aithos Tech</h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Transformando dados em conhecimento, conhecimento em poder. 
              A Aithos Tech está redefinindo o futuro da gestão de informações corporativas.
            </p>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Mail className="h-8 w-8 text-blue-400" />
              </div>
              <h4 className="font-semibold mb-2">Email</h4>
              <a 
                href="mailto:contato@aithos.tech" 
                className="text-blue-400 hover:text-blue-300 transition-colors duration-300"
              >
                contato@aithos.tech
              </a>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Phone className="h-8 w-8 text-blue-400" />
              </div>
              <h4 className="font-semibold mb-2">Telefone</h4>
              <a 
                href="tel:+5511123456789" 
                className="text-blue-400 hover:text-blue-300 transition-colors duration-300"
              >
                +55 11 1234-5678
              </a>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <MapPin className="h-8 w-8 text-blue-400" />
              </div>
              <h4 className="font-semibold mb-2">Localização</h4>
              <p className="text-gray-300">São Paulo, Brasil</p>
            </div>
          </div>

          {/* Bottom Links */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex space-x-8">
                <a 
                  href="#" 
                  className="text-gray-300 hover:text-white transition-colors duration-300"
                >
                  Política de Privacidade
                </a>
                <a 
                  href="#" 
                  className="text-gray-300 hover:text-white transition-colors duration-300"
                >
                  Termos de Uso
                </a>
              </div>
              <div className="text-gray-400 text-sm">
                © 2024 Aithos Tech. Todos os direitos reservados.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;