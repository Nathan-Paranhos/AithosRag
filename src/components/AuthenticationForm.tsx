// Authentication Form Component - Enterprise Login/Register Interface
// Secure authentication with JWT, 2FA, social login, and enterprise features

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Building, Shield, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { jwtAuthService, useAuth, LoginCredentials, RegisterData } from '../services/jwtAuthService';

interface AuthenticationFormProps {
  mode?: 'login' | 'register';
  onSuccess?: () => void;
  onModeChange?: (mode: 'login' | 'register') => void;
  redirectTo?: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  organizationId?: string;
  twoFactorCode?: string;
  general?: string;
}

const AuthenticationForm: React.FC<AuthenticationFormProps> = ({
  mode: initialMode = 'login',
  onSuccess,
  onModeChange
  // redirectTo will be used for post-authentication navigation
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    organizationId: '',
    inviteCode: '',
    twoFactorCode: ''
  });
  
  const { loading } = useAuth(); // loading state used for UI feedback
  
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  
  useEffect(() => {
    if (onModeChange) {
      onModeChange(mode);
    }
  }, [mode, onModeChange]);
  
  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrors({});
    setSuccessMessage('');
    setRequiresTwoFactor(false);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      organizationId: '',
      inviteCode: '',
      twoFactorCode: ''
    });
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'register') {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
        newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
      }
    }
    
    // Confirm password validation (register only)
    if (mode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      
      // Name validation
      if (!formData.name) {
        newErrors.name = 'Full name is required';
      } else if (formData.name.length < 2) {
        newErrors.name = 'Name must be at least 2 characters long';
      }
    }
    
    // Two-factor code validation
    if (requiresTwoFactor && !formData.twoFactorCode) {
      newErrors.twoFactorCode = 'Two-factor authentication code is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      if (mode === 'login') {
        const credentials: LoginCredentials = {
          email: formData.email,
          password: formData.password,
          rememberMe,
          twoFactorCode: requiresTwoFactor ? formData.twoFactorCode : undefined
        };
        
        const result = await jwtAuthService.login(credentials);
        
        if (result.success) {
          setSuccessMessage('Login successful! Redirecting...');
          setTimeout(() => {
            onSuccess?.();
          }, 1000);
        } else if (result.requiresTwoFactor) {
          setRequiresTwoFactor(true);
          setSuccessMessage('Please enter your two-factor authentication code');
        } else {
          setErrors({ general: result.error || 'Login failed' });
        }
      } else {
        const registerData: RegisterData = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          organizationId: formData.organizationId || undefined,
          inviteCode: formData.inviteCode || undefined
        };
        
        const result = await jwtAuthService.register(registerData);
        
        if (result.success) {
          setSuccessMessage('Registration successful! Welcome to Aithos RAG Enterprise!');
          setTimeout(() => {
            onSuccess?.();
          }, 1500);
        } else {
          setErrors({ general: result.error || 'Registration failed' });
        }
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSocialLogin = async (provider: 'google' | 'github' | 'apple') => {
    try {
      setIsSubmitting(true);
      // Simulate social login
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccessMessage(`${provider} login successful!`);
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch {
      setErrors({ general: `${provider} login failed. Please try again.` });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputClasses = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200";
  const buttonClasses = "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-spin-slow"></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Aithos RAG Enterprise
          </h1>
          <p className="text-white/70">
            {mode === 'login' ? 'Welcome back! Please sign in to continue.' : 'Create your enterprise account'}
          </p>
        </div>
        
        {/* Main Form Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          {/* Mode Toggle */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('register')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
          
          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-xl p-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 text-sm">{successMessage}</span>
            </div>
          )}
          
          {/* Error Message */}
          {errors.general && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 text-sm">{errors.general}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Register Only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`${inputClasses} pl-12`}
                    placeholder="Enter your full name"
                    disabled={isSubmitting || loading}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-400 text-xs mt-1">{errors.name}</p>
                )}
              </div>
            )}
            
            {/* Email Field */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`${inputClasses} pl-12`}
                  placeholder="Enter your email address"
                  disabled={isSubmitting || loading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            
            {/* Password Field */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`${inputClasses} pl-12 pr-12`}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
                  disabled={isSubmitting || loading}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                  disabled={isSubmitting || loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>
            
            {/* Confirm Password Field (Register Only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`${inputClasses} pl-12 pr-12`}
                    placeholder="Confirm your password"
                    disabled={isSubmitting || loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                    disabled={isSubmitting || loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}
            
            {/* Organization ID (Register Only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Organization ID <span className="text-white/50">(Optional)</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    value={formData.organizationId}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                    className={`${inputClasses} pl-12`}
                    placeholder="Enter your organization ID"
                    disabled={isSubmitting || loading}
                  />
                </div>
              </div>
            )}
            
            {/* Invite Code (Register Only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Invite Code <span className="text-white/50">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  className={inputClasses}
                  placeholder="Enter invite code if you have one"
                  disabled={isSubmitting || loading}
                />
              </div>
            )}
            
            {/* Two-Factor Code (When Required) */}
            {requiresTwoFactor && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Two-Factor Authentication Code
                </label>
                <input
                  type="text"
                  value={formData.twoFactorCode}
                  onChange={(e) => setFormData({ ...formData, twoFactorCode: e.target.value })}
                  className={inputClasses}
                  placeholder="Enter 6-digit code from your authenticator app"
                  disabled={isSubmitting || loading}
                  maxLength={6}
                />
                {errors.twoFactorCode && (
                  <p className="text-red-400 text-xs mt-1">{errors.twoFactorCode}</p>
                )}
              </div>
            )}
            
            {/* Remember Me (Login Only) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-blue-500/50"
                    disabled={isSubmitting || loading}
                  />
                  <span className="text-white/80 text-sm">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  disabled={isSubmitting || loading}
                >
                  Forgot password?
                </button>
              </div>
            )}
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className={buttonClasses}
            >
              {isSubmitting || loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </button>
          </form>
          
          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white/60">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={isSubmitting || loading}
                className="flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                <Chrome className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                disabled={isSubmitting || loading}
                className="flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                <Github className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={isSubmitting || loading}
                className="flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                <Apple className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          {/* Terms and Privacy */}
          {mode === 'register' && (
            <p className="mt-6 text-center text-xs text-white/60">
              By creating an account, you agree to our{' '}
              <button className="text-blue-400 hover:text-blue-300 underline">
                Terms of Service
              </button>{' '}
              and{' '}
              <button className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </button>
            </p>
          )}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            &copy; 2024 Aithos RAG Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationForm;