/**
 * Icon utilities and re-exports from lucide-react
 * Centralized icon management for consistent usage across the app
 */

// Re-export commonly used icons from lucide-react
export {
  AlertTriangle,
  RefreshCw,
  Bug,
  Home,
  Send,
  Brain,
  Cpu,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  User,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  Trash2,
  Download,
  Upload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  Share,
  Bookmark,
  Filter,
  Sort,
  Grid,
  List,
  Play,
  Pause,
  Stop,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MoreHorizontal,
  MoreVertical
} from 'lucide-react';

// Icon size presets
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48
} as const;

// Icon color presets
export const iconColors = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
  info: 'text-blue-500',
  muted: 'text-gray-400'
} as const;

// Helper function to get icon class names
export const getIconClassName = (size: keyof typeof iconSizes = 'md', color?: keyof typeof iconColors) => {
  const sizeClass = `w-${iconSizes[size]} h-${iconSizes[size]}`;
  const colorClass = color ? iconColors[color] : '';
  return `${sizeClass} ${colorClass}`.trim();
};

import React from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// Common icon combinations
export const LoadingIcon: React.FC<{ className?: string; size?: keyof typeof iconSizes }> = ({ className = '', size = 'md' }) => {
  return React.createElement(Loader2, { className: `animate-spin ${getIconClassName(size)} ${className}` });
};

export const SuccessIcon: React.FC<{ className?: string; size?: keyof typeof iconSizes }> = ({ className = '', size = 'md' }) => {
  return React.createElement(CheckCircle, { className: `${getIconClassName(size, 'success')} ${className}` });
};

export const ErrorIcon: React.FC<{ className?: string; size?: keyof typeof iconSizes }> = ({ className = '', size = 'md' }) => {
  return React.createElement(XCircle, { className: `${getIconClassName(size, 'error')} ${className}` });
};

export const WarningIcon: React.FC<{ className?: string; size?: keyof typeof iconSizes }> = ({ className = '', size = 'md' }) => {
  return React.createElement(AlertTriangle, { className: `${getIconClassName(size, 'warning')} ${className}` });
};

export const InfoIcon: React.FC<{ className?: string; size?: keyof typeof iconSizes }> = ({ className = '', size = 'md' }) => {
  return React.createElement(Info, { className: `${getIconClassName(size, 'info')} ${className}` });
};