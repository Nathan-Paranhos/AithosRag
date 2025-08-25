import React, { Suspense, lazy } from 'react';
import LoadingSpinner from './LoadingSpinner';
import UpdateNotification, { OfflineBanner } from './UpdateNotification';
import ErrorBoundary from './ErrorBoundary';
import { usePWA } from '../hooks/usePWA';

// Lazy loading dos componentes para otimização
const Navbar = lazy(() => import('./Navbar'));
const Hero = lazy(() => import('./Hero'));
const About = lazy(() => import('./About'));
const Product = lazy(() => import('./Product'));
const Challenges = lazy(() => import('./Challenges'));
const Footer = lazy(() => import('./Footer'));

const HomePage: React.FC = () => {
  const { isOnline } = usePWA();

  return (
    <div className="min-h-screen">
      {/* Banner offline */}
      <OfflineBanner />
      
      {/* Notificação de atualização */}
      <UpdateNotification />
      
      {/* Conteúdo principal com lazy loading */}
      <Suspense fallback={<LoadingSpinner size="lg" className="my-8" />}>
        <Navbar />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner size="lg" className="my-8" />}>
        <Hero />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner size="md" className="my-6" />}>
        <About />
      </Suspense>
      
      <ErrorBoundary
        fallback={
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 m-4">
            <h3 className="text-destructive font-medium mb-2">Erro no Chat</h3>
            <p className="text-destructive/80 text-sm">O sistema de chat encontrou um problema. Recarregue a página para tentar novamente.</p>
          </div>
        }
      >
        <Suspense fallback={<LoadingSpinner variant="ai" size="lg" message="Inicializando IA..." className="my-8" />}>
          <Product />
        </Suspense>
      </ErrorBoundary>
      
      <Suspense fallback={<LoadingSpinner size="md" className="my-6" />}>
        <Challenges />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner size="sm" className="my-4" />}>
        <Footer />
      </Suspense>
      
      {/* Indicador de status de conexão (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isOnline 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            Status: {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;