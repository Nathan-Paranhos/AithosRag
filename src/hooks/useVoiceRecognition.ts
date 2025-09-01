import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface UseVoiceRecognitionProps {
  onResult: (transcript: string) => void;
  language?: string;
}

export const useVoiceRecognition = ({ 
  onResult, 
  language = 'pt-BR' 
}: UseVoiceRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language;
      
      // Handle results
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };
      
      // Handle errors
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        switch (event.error) {
          case 'no-speech':
            toast.error('Nenhuma fala detectada');
            break;
          case 'audio-capture':
            toast.error('Erro ao capturar áudio');
            break;
          case 'not-allowed':
            toast.error('Permissão de microfone negada');
            break;
          default:
            toast.error('Erro no reconhecimento de voz');
        }
      };
      
      // Handle end
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsSupported(false);
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult, language]);

  const startListening = () => {
    if (!isSupported) {
      toast.error('Reconhecimento de voz não suportado');
      return;
    }

    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não inicializado');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast.error('Erro ao iniciar reconhecimento de voz');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
};

export default useVoiceRecognition;