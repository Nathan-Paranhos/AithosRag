import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Input, SearchInput } from './ui/Input';
import { ThemeToggle } from './ui/ThemeToggle';
import { useTheme } from '../hooks/useThemeContext';
import { Search, Heart, Star, Settings, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const DesignSystemDemo: React.FC = () => {
  const { theme } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    console.log('Searching for:', value);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simular uma operação assíncrona
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    console.log('Form submitted:', { email, password });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Design System Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Demonstração dos componentes do sistema de design Aithos RAG
          </p>
          <div className="flex justify-center items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Tema atual: <span className="font-medium capitalize">{theme}</span>
            </span>
            <ThemeToggle variant="switch" />
          </div>
        </div>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Botões</CardTitle>
            <CardDescription>
              Diferentes variantes e tamanhos de botões disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Button Variants */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Variantes</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="gradient">Gradient</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Tamanhos</h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra Small</Button>
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Button States */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Estados</h4>
              <div className="flex flex-wrap gap-3">
                <Button loading={isLoading} onClick={handleSubmit}>
                  {isLoading ? 'Carregando...' : 'Clique para carregar'}
                </Button>
                <Button disabled>Desabilitado</Button>
                <Button leftIcon={<Heart className="h-4 w-4" />}>
                  Com Ícone
                </Button>
                <Button rightIcon={<Star className="h-4 w-4" />} variant="outline">
                  Ícone Direita
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Card Padrão</CardTitle>
              <CardDescription>
                Este é um card com estilo padrão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Conteúdo do card com informações relevantes.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" className="w-full">
                Ação
              </Button>
            </CardFooter>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Card Elevado</CardTitle>
              <CardDescription>
                Card com sombra elevada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Este card possui uma sombra mais pronunciada.
              </p>
            </CardContent>
          </Card>

          <Card variant="glass" className="backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Card Glass</CardTitle>
              <CardDescription>
                Efeito glassmorphism
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Card com efeito de vidro translúcido.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Inputs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Campos de Entrada</CardTitle>
            <CardDescription>
              Diferentes tipos e variantes de inputs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Variants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Padrão</label>
                <Input 
                  placeholder="Digite algo..."
                  variant="default"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Preenchido</label>
                <Input 
                  placeholder="Input preenchido"
                  variant="filled"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Input com Contorno</label>
                <Input 
                  placeholder="Input com borda"
                  variant="outlined"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Ghost</label>
                <Input 
                  placeholder="Input transparente"
                  variant="ghost"
                />
              </div>
            </div>

            {/* Input with Icons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input 
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                  clearable
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Busca</label>
              <SearchInput 
                placeholder="Buscar..."
                onSearch={handleSearch}
                debounceMs={300}
                className="max-w-md"
              />
              {searchValue && (
                <p className="text-xs text-muted-foreground">
                  Buscando por: "{searchValue}"
                </p>
              )}
            </div>

            {/* Input Sizes */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Tamanhos</h4>
              <div className="space-y-3">
                <Input size="sm" placeholder="Input pequeno" />
                <Input size="md" placeholder="Input médio (padrão)" />
                <Input size="lg" placeholder="Input grande" />
              </div>
            </div>

            {/* Input States */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Estados</h4>
              <div className="space-y-3">
                <Input placeholder="Input normal" />
                <Input placeholder="Input com erro" error />
                <Input placeholder="Input com sucesso" success />
                <Input placeholder="Input desabilitado" disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Toggle Section */}
        <Card>
          <CardHeader>
            <CardTitle>Alternador de Tema</CardTitle>
            <CardDescription>
              Diferentes variantes do alternador de tema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Botão</label>
                <ThemeToggle variant="button" size="md" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Switch</label>
                <ThemeToggle variant="switch" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Dropdown</label>
                <ThemeToggle variant="dropdown" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Design System Aithos RAG - Componentes reutilizáveis e consistentes
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemDemo;