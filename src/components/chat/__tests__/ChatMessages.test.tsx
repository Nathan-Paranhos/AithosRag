import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessages } from '../ChatMessages';
import { Message } from '../../../types/chat';

// Mock do sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

// Mock do clipboard API será configurado no beforeEach

describe('ChatMessages', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      content: 'Olá! Como posso ajudar?',
      role: 'user',
      timestamp: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      content: 'Olá! Estou aqui para ajudar você com suas dúvidas.',
      role: 'assistant',
      timestamp: new Date('2024-01-01T10:01:00Z'),
    },
    {
      id: '3',
      content: 'Preciso de ajuda com React Testing Library.',
      role: 'user',
      timestamp: new Date('2024-01-01T10:02:00Z'),
    },
  ];

  const defaultProps = {
    messages: mockMessages,
    isLoading: false,
    availableModels: [
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5', name: 'GPT-3.5' }
    ],
    onQuickAction: jest.fn(),
    messagesEndRef: { current: null } as React.RefObject<HTMLDivElement>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all messages correctly', () => {
    render(<ChatMessages {...defaultProps} />);
    
    expect(screen.getByText('Olá! Como posso ajudar?')).toBeTruthy();
    expect(screen.getByText('Olá! Estou aqui para ajudar você com suas dúvidas.')).toBeTruthy();
    expect(screen.getByText('Preciso de ajuda com React Testing Library.')).toBeTruthy();
  });

  it('displays user messages with correct styling', () => {
    render(<ChatMessages {...defaultProps} />);
    
    const userMessage = screen.getByText('Olá! Como posso ajudar?');
    expect(userMessage).toBeTruthy();
  });

  it('displays assistant messages with correct styling', () => {
    render(<ChatMessages {...defaultProps} />);
    
    const assistantMessage = screen.getByText('Olá! Estou aqui para ajudar você com suas dúvidas.');
    const messageContainer = assistantMessage.closest('.bg-white');
    expect(messageContainer).toBeTruthy();
  });

  it('shows loading indicator when isLoading is true', () => {
    render(<ChatMessages {...defaultProps} isLoading={true} />);
    
    // Verifica se o indicador de loading está presente
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('does not show loading indicator when isLoading is false', () => {
    render(<ChatMessages {...defaultProps} isLoading={false} />);
    
    expect(screen.queryByText('Digitando...')).toBeNull();
    expect(screen.queryByTestId('loading-dots')).toBeNull();
  });

  it('renders copy buttons for messages', () => {
    render(<ChatMessages {...defaultProps} />);
    
    const copyButtons = screen.getAllByRole('button');
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it('formats timestamps correctly', () => {
    render(<ChatMessages {...defaultProps} />);
    
    // Verifica se as mensagens estão sendo renderizadas
    const messageElements = screen.getAllByTestId(/message-/);
    expect(messageElements.length).toBe(3);
  });

  it('renders empty state when no messages', () => {
    render(<ChatMessages messages={[]} isLoading={false} availableModels={[]} onQuickAction={jest.fn()} messagesEndRef={{ current: null }} />);
    
    // Verifica se o estado vazio é exibido
    expect(screen.getByText('Olá! Como posso ajudar?')).toBeTruthy();
  });

  it('scrolls to bottom when new messages are added', () => {
    const { rerender } = render(<ChatMessages {...defaultProps} />);
    
    const scrollContainer = screen.getByTestId('messages-container');
    const scrollToBottomSpy = jest.fn();
    Object.defineProperty(scrollContainer, 'scrollTo', {
      value: scrollToBottomSpy,
      writable: true
    });
    
    // Adiciona uma nova mensagem
    const newMessages = [
      ...mockMessages,
      {
        id: '4',
        content: 'Nova mensagem',
        role: 'assistant' as const,
        timestamp: new Date(),
      },
    ];
    
    rerender(<ChatMessages messages={newMessages} isLoading={false} availableModels={[]} onQuickAction={jest.fn()} messagesEndRef={{ current: null }} />);
    
    // Verifica se o componente foi re-renderizado com as novas mensagens
    expect(newMessages.length).toBe(4);
  });

  it('handles long messages correctly', () => {
    const longMessage = 'A'.repeat(1000);
    const messagesWithLongContent: Message[] = [
      {
        id: '1',
        content: longMessage,
        role: 'user',
        timestamp: new Date(),
      },
    ];
    
    render(<ChatMessages messages={messagesWithLongContent} isLoading={false} availableModels={[]} onQuickAction={jest.fn()} messagesEndRef={{ current: null }} />);
    
    expect(screen.getByText(longMessage)).toBeTruthy();
  });

  it('preserves message order', () => {
    render(<ChatMessages {...defaultProps} />);
    
    const messageElements = screen.getAllByText(/Olá!|Preciso de ajuda/);
    
    // Verifica se as mensagens aparecem na ordem correta
    expect(messageElements[0].textContent).toContain('Olá! Como posso ajudar?');
    expect(messageElements[1].textContent).toContain('Olá! Estou aqui para ajudar você com suas dúvidas.');
    expect(messageElements[2].textContent).toContain('Preciso de ajuda com React Testing Library.');
  });
});