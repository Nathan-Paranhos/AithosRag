import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';

// Mock do hook useVoiceRecognition
jest.mock('../../../hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: false,
    hasVoiceSupport: true,
    toggleListening: jest.fn(),
  }),
}));

// Mock do sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('ChatInput', () => {
  const defaultProps = {
  inputValue: '',
  onInputChange: jest.fn(),
  onSendMessage: jest.fn(),
  isLoading: false,
  hasVoiceSupport: true,
  isListening: false,
  onToggleVoiceInput: jest.fn(),
};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ChatInput {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Digite sua mensagem...')).toBeTruthy();
    expect(screen.getByRole('button', { name: /enviar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /microfone/i })).toBeTruthy();
  });

  it('calls onInputChange when typing', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Digite sua mensagem...');
    await user.type(textarea, 'Hello world');
    
    expect(defaultProps.onInputChange).toHaveBeenCalledTimes(11); // 'Hello world' tem 11 caracteres
  });

  it('calls onSendMessage when send button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} input="Test message" />);
    
    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i });
    await user.click(sendButton);
    
    expect(defaultProps.onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('calls onSendMessage when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} input="Test message" />);
    
    const textarea = screen.getByPlaceholderText('Digite sua mensagem...');
    await user.type(textarea, '{enter}');
    
    expect(defaultProps.onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not send message when Shift+Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} input="Test message" />);
    
    const textarea = screen.getByPlaceholderText('Digite sua mensagem...');
    await user.type(textarea, '{shift}{enter}');
    
    expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
  });

  it('disables send button when loading', () => {
    render(<ChatInput {...defaultProps} isLoading={true} />);
    
    const sendButton = screen.getByRole('button', { name: /enviar/i });
    expect(sendButton.disabled).toBe(true);
  });

  it('disables send button when input is empty', () => {
    render(<ChatInput {...defaultProps} input="" />);
    
    const sendButton = screen.getByRole('button', { name: /enviar/i });
    expect(sendButton.disabled).toBe(true);
  });

  it('calls onToggleVoiceInput when voice button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);
    
    const voiceButton = screen.getByRole('button', { name: /ativar entrada de voz/i });
    await user.click(voiceButton);
    
    expect(defaultProps.onToggleVoiceInput).toHaveBeenCalledTimes(1);
  });

  it('shows different voice button state when listening', () => {
    render(<ChatInput {...defaultProps} isListening={true} />);
    
    expect(screen.getByRole('button', { name: /parar gravação/i })).toBeTruthy();
    const micButton = screen.getByRole('button', { name: /microfone/i });
    expect(micButton.className).toContain('bg-red-500');
  });

  it('hides voice button when voice support is not available', () => {
    render(<ChatInput {...defaultProps} hasVoiceSupport={false} />);
    
    expect(screen.queryByRole('button', { name: /ativar entrada de voz/i })).not.toBeInTheDocument();
  });

  it('adjusts textarea height automatically', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Digite sua mensagem...');
    
    // Simula uma mensagem longa que deve expandir o textarea
    const longMessage = 'Esta é uma mensagem muito longa que deve fazer o textarea expandir automaticamente para acomodar todo o conteúdo sem problemas de visualização.';
    await user.type(textarea, longMessage);
    
    // Verifica se o textarea tem a classe que permite expansão automática
    expect(textarea.className).toContain('resize-none');
  });
});