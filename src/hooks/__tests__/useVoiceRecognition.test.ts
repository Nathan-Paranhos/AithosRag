import { renderHook, act } from '@testing-library/react';
import { useVoiceRecognition } from '../useVoiceRecognition';
import { toast } from 'sonner';

// Mock do sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock do SpeechRecognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
};

const mockSpeechRecognitionConstructor = jest.fn(() => mockSpeechRecognition);

describe('useVoiceRecognition', () => {
  const mockOnResult = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock global SpeechRecognition
    Object.defineProperty(window, 'SpeechRecognition', {
      writable: true,
      value: mockSpeechRecognitionConstructor,
    });
    
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      writable: true,
      value: mockSpeechRecognitionConstructor,
    });
  });

  afterEach(() => {
    // Limpa os mocks
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('initializes with correct default values when SpeechRecognition is supported', () => {
    const { result } = renderHook(() => useVoiceRecognition(mockOnResult));

    expect(result.current.isListening).toBe(false);
    expect(result.current.hasVoiceSupport).toBe(true);
    expect(typeof result.current.toggleListening).toBe('function');
  });

  it('detects when SpeechRecognition is not supported', () => {
    // Remove SpeechRecognition support
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const { result } = renderHook(() => useVoiceRecognition(mockOnResult));

    expect(result.current.hasVoiceSupport).toBe(false);
  });

  it('configures SpeechRecognition correctly when supported', () => {
    renderHook(() => useVoiceRecognition(mockOnResult));

    expect(mockSpeechRecognitionConstructor).toHaveBeenCalled();
    expect(mockSpeechRecognition.continuous).toBe(true);
    expect(mockSpeechRecognition.interimResults).toBe(true);
    expect(mockSpeechRecognition.lang).toBe('pt-BR');
  });

  it('starts listening when toggleListening is called and not currently listening', () => {
    const { result } = renderHook(() => useVoiceRecognition(mockOnResult));

    act(() => {
      result.current.toggleListening();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
  });

  it('stops listening when toggleListening is called and currently listening', () => {
    const { result } = renderHook(() => useVoiceRecognition(mockOnResult));

    // Primeiro inicia
    act(() => {
      result.current.toggleListening();
    });

    // Depois para
    act(() => {
      result.current.toggleListening();
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('handles speech recognition results correctly', () => {
    renderHook(() => useVoiceRecognition(mockOnResult));

    // Simula o evento de resultado
    const mockEvent = {
      results: [
        {
          0: { transcript: 'Hello world' },
          isFinal: true,
        },
      ],
    };

    // Encontra o listener de resultado e o chama
    const addEventListenerCalls = mockSpeechRecognition.addEventListener.mock.calls;
    const resultListener = addEventListenerCalls.find(call => call[0] === 'result')?.[1];
    
    if (resultListener) {
      resultListener(mockEvent);
      expect(mockOnResult).toHaveBeenCalledWith('Hello world');
    }
  });

  it('handles speech recognition errors correctly', () => {
    renderHook(() => useVoiceRecognition(mockOnResult));

    // Simula um erro
    const mockError = {
      error: 'network',
    };

    // Encontra o listener de erro e o chama
    const addEventListenerCalls = mockSpeechRecognition.addEventListener.mock.calls;
    const errorListener = addEventListenerCalls.find(call => call[0] === 'error')?.[1];
    
    if (errorListener) {
      errorListener(mockError);
      expect(toast.error).toHaveBeenCalledWith('Erro no reconhecimento de voz: network');
    }
  });

  it('handles speech recognition end event correctly', () => {
    const { result } = renderHook(() => useVoiceRecognition(mockOnResult));

    // Inicia a escuta
    act(() => {
      result.current.toggleListening();
    });

    expect(result.current.isListening).toBe(true);

    // Simula o evento de fim
    const addEventListenerCalls = mockSpeechRecognition.addEventListener.mock.calls;
    const endListener = addEventListenerCalls.find(call => call[0] === 'end')?.[1];
    
    if (endListener) {
      act(() => {
        endListener();
      });
      expect(result.current.isListening).toBe(false);
    }
  });

  it('does not start listening when voice support is not available', () => {
    // Remove SpeechRecognition support
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const { result } = renderHook(() => useVoiceRecognition(mockOnResult));

    act(() => {
      result.current.toggleListening();
    });

    expect(result.current.isListening).toBe(false);
    expect(mockSpeechRecognition.start).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useVoiceRecognition(mockOnResult));

    unmount();

    expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledTimes(3);
    expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith('result', expect.any(Function));
    expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith('end', expect.any(Function));
  });
});