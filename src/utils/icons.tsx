/* eslint-disable react-refresh/only-export-components */
import React from 'react';

/**
 * CENTRALIZED ICON IMPORTS
 * Importa apenas os ícones necessários do lucide-react para otimizar o bundle
 */

// Importações centralizadas dos ícones realmente utilizados
import {
  // Navigation & UI
  Menu,
  X,
  Home,
  Search,
  Settings,
  User,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  
  // Communication
  MessageSquare,
  MessageCircle,
  Mail,
  Phone,
  Send,
  Bell,
  BellOff,
  
  // Status & Feedback
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  Activity,
  Info,
  
  // Media & Content
  Eye,
  EyeOff,
  Download,
  Upload,
  Copy,
  Share2,
  Edit,
  Edit3,
  Trash2,
  Archive,
  FileText,
  Image,
  Code,
  
  // Technology & AI
  Brain,
  Bot,
  Cpu,
  Zap,
  Sparkles,
  Database,
  Shield,
  Lock,
  Key,
  
  // Analytics & Charts
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  
  // Connectivity
  Wifi,
  WifiOff,
  Globe,
  Smartphone,
  Monitor,
  
  // Audio & Video
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Headphones,
  Waves,
  Video,
  
  // Theme & Display
  Moon,
  Sun,
  Palette,
  
  // Business & Enterprise
  Building,
  Building2,
  DollarSign,
  Crown,
  
  // Utility
  Filter,
  Calendar,
  MapPin,
  Tag,
  Star,
  History,
  RotateCcw,
  Bug,
  Package,
  Route as RouteIcon,
  Link,
  Hash,
  Minus,
  Signal,
  Check,
  UserPlus,
  Languages
} from 'lucide-react';

// Tipos para os ícones
export type IconType = React.ComponentType<{
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
}>;

// Mapa de ícones para facilitar o uso dinâmico
export const iconMap = {
  menu: Menu,
  close: X,
  home: Home,
  search: Search,
  settings: Settings,
  user: User,
  users: Users,
  plus: Plus,
  message: MessageSquare,
  bell: Bell,
  check: CheckCircle,
  alert: AlertTriangle,
  loading: Loader2,
  refresh: RefreshCw,
  brain: Brain,
  bot: Bot,
  zap: Zap,
  shield: Shield,
  chart: BarChart3,
  trending: TrendingUp,
  wifi: Wifi,
  download: Download,
  upload: Upload,
  mic: Mic,
  sun: Sun,
  moon: Moon
} as const;

export type IconName = keyof typeof iconMap;

// Componente helper para usar ícones dinamicamente
export const DynamicIcon: React.FC<{
  name: IconName;
  size?: number | string;
  className?: string;
}> = ({ name, size = 20, className = '' }) => {
  const IconComponent = iconMap[name];
  return <IconComponent size={size} className={className} />;
};

// Exportar ícones individuais para uso direto
export {
  Menu,
  X,
  Home,
  Search,
  Settings,
  User,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  MessageSquare,
  MessageCircle,
  Mail,
  Phone,
  Send,
  Bell,
  BellOff,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  Activity,
  Info,
  Eye,
  EyeOff,
  Download,
  Upload,
  Copy,
  Share2,
  Edit,
  Edit3,
  Trash2,
  Archive,
  FileText,
  Image,
  Code,
  Brain,
  Bot,
  Cpu,
  Zap,
  Sparkles,
  Database,
  Shield,
  Lock,
  Key,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Wifi,
  WifiOff,
  Globe,
  Smartphone,
  Monitor,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Headphones,
  Waves,
  Video,
  Moon,
  Sun,
  Palette,
  Building,
  Building2,
  DollarSign,
  Crown,
  Filter,
  Calendar,
  MapPin,
  Tag,
  Star,
  History,
  RotateCcw,
  Bug,
  Package,
  RouteIcon,
  Link,
  Hash,
  Minus,
  Signal,
  Check,
  UserPlus,
  Languages
};