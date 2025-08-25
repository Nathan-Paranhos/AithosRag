import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Square, Settings, Headphones, Waves } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { cn } from '../utils/cn';

// Interfaces
interface VoiceSettings {
  language: string;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  continuousListening: boolean;
  noiseReduction: boolean;
  wakeWord: string;
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
}

interface VoiceIOProps {
  className?: string;
  onTranscript?: (result: VoiceRecognitionResult) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: string) => void;
  autoSpeak?: boolean;
  language?: string;
}

// Voice recognition hook
const useVoiceRecognition = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            maxConfidence = Math.max(maxConfidence, result[0].confidence);
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
        setConfidence(maxConfidence);
      };
      
      recognition.onerror = (event: any) => {
        setError(event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Reconhecimento de voz não suportado neste navegador');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isSupported,
    isListening,
    transcript,
    confidence,
    error,
    startListening,
    stopListening,
    toggleListening
  };
};

// Speech synthesis hook
const useSpeechSynthesis = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Select Portuguese voice by default
        const portugueseVoice = availableVoices.find(voice => 
          voice.lang.startsWith('pt') || voice.name.toLowerCase().includes('portuguese')
        );
        if (portugueseVoice) {
          setSelectedVoice(portugueseVoice);
        } else if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0]);
        }
      };
      
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback((text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
  }) => {
    if (!isSupported || !text.trim()) return;
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    utterance.voice = options?.voice || selectedVoice;
    utterance.rate = options?.rate || 1;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice]);

  const pause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (isSpeaking && isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSpeaking, isPaused]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    pause,
    resume,
    stop
  };
};

const VoiceIO: React.FC<VoiceIOProps> = ({
  className,
  onTranscript,
  onSpeechStart,
  onSpeechEnd,
  onError,
  autoSpeak = false,
  language = 'pt-BR'
}) => {
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'pt-BR',
    voice: '',
    rate: 1,
    pitch: 1,
    volume: 1,
    autoSpeak: autoSpeak,
    continuousListening: false,
    noiseReduction: true,
    wakeWord: 'assistente'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [recentTranscripts, setRecentTranscripts] = useState<VoiceRecognitionResult[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    isSupported: recognitionSupported,
    isListening,
    transcript,
    confidence,
    error: recognitionError,
    startListening,
    stopListening,
    toggleListening
  } = useVoiceRecognition();

  const {
    isSupported: synthesisSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    pause,
    resume,
    stop
  } = useSpeechSynthesis();

  // Initialize audio context for visualization
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        
        microphoneRef.current.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        
        const updateAudioLevel = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            setAudioLevel(average / 255);
          }
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };
        
        updateAudioLevel();
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    if (isListening) {
      initAudioContext();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isListening]);

  // Handle transcript updates
  useEffect(() => {
    if (transcript) {
      const result: VoiceRecognitionResult = {
        transcript,
        confidence,
        isFinal: confidence > 0,
        timestamp: new Date()
      };
      
      setRecentTranscripts(prev => {
        const updated = [result, ...prev.slice(0, 9)];
        return updated;
      });
      
      onTranscript?.(result);
      
      // Check for wake word
      if (settings.wakeWord && transcript.toLowerCase().includes(settings.wakeWord.toLowerCase())) {
        setIsWakeWordActive(true);
        setTimeout(() => setIsWakeWordActive(false), 3000);
      }
    }
  }, [transcript, confidence, onTranscript, settings.wakeWord]);

  // Handle speech events
  useEffect(() => {
    if (isListening) {
      onSpeechStart?.();
    } else {
      onSpeechEnd?.();
    }
  }, [isListening, onSpeechStart, onSpeechEnd]);

  // Handle errors
  useEffect(() => {
    if (recognitionError) {
      onError?.(recognitionError);
    }
  }, [recognitionError, onError]);

  // Auto-speak functionality
  const handleAutoSpeak = useCallback((text: string) => {
    if (settings.autoSpeak && synthesisSupported) {
      speak(text, {
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
        voice: selectedVoice || undefined
      });
    }
  }, [settings, synthesisSupported, speak, selectedVoice]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAudioLevelColor = (level: number) => {
    if (level >= 0.7) return 'bg-red-500';
    if (level >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            Controle de Voz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Recognition */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Reconhecimento de Voz</h3>
              <div className="flex items-center gap-2">
                {recognitionSupported ? (
                  <span className="text-sm text-green-600">✓ Suportado</span>
                ) : (
                  <span className="text-sm text-red-600">✗ Não suportado</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="lg"
                onClick={toggleListening}
                disabled={!recognitionSupported}
                className="relative"
              >
                {isListening ? (
                  <MicOff className="w-5 h-5 mr-2" />
                ) : (
                  <Mic className="w-5 h-5 mr-2" />
                )}
                {isListening ? 'Parar Escuta' : 'Iniciar Escuta'}
                
                {isListening && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </Button>

              {/* Audio Level Indicator */}
              {isListening && (
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-muted-foreground" />
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-1 h-6 rounded-full transition-all duration-100',
                          audioLevel * 10 > i ? getAudioLevelColor(audioLevel) : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(audioLevel * 100)}%
                  </span>
                </div>
              )}

              {/* Wake Word Indicator */}
              {isWakeWordActive && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  Wake Word Detectado
                </div>
              )}
            </div>

            {/* Current Transcript */}
            {transcript && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Transcrição Atual:</span>
                  <span className={cn(
                    'text-xs font-medium',
                    getConfidenceColor(confidence)
                  )}>
                    {Math.round(confidence * 100)}% confiança
                  </span>
                </div>
                <p className="text-foreground">{transcript}</p>
              </div>
            )}

            {recognitionError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                Erro: {recognitionError}
              </div>
            )}
          </div>

          {/* Speech Synthesis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Síntese de Voz</h3>
              <div className="flex items-center gap-2">
                {synthesisSupported ? (
                  <span className="text-sm text-green-600">✓ Suportado</span>
                ) : (
                  <span className="text-sm text-red-600">✗ Não suportado</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSpeaking ? (
                <>
                  {isPaused ? (
                    <Button onClick={resume} variant="outline">
                      <Play className="w-4 h-4 mr-2" />
                      Continuar
                    </Button>
                  ) : (
                    <Button onClick={pause} variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </Button>
                  )}
                  <Button onClick={stop} variant="destructive">
                    <Square className="w-4 h-4 mr-2" />
                    Parar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => handleAutoSpeak('Teste de síntese de voz funcionando perfeitamente.')}
                  disabled={!synthesisSupported}
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Testar Voz
                </Button>
              )}

              {/* Speaking Indicator */}
              {isSpeaking && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {isPaused ? 'Pausado' : 'Falando'}
                </div>
              )}
            </div>
          </div>

          {/* Settings Toggle */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Voz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Voz:</label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = voices.find(v => v.name === e.target.value);
                  if (voice) setSelectedVoice(voice);
                }}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                {voices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Velocidade: {settings.rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.rate}
                  onChange={(e) => setSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tom: {settings.pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.pitch}
                  onChange={(e) => setSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Volume: {Math.round(settings.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.volume}
                  onChange={(e) => setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSpeak"
                  checked={settings.autoSpeak}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoSpeak: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="autoSpeak" className="text-sm font-medium">
                  Falar automaticamente as respostas
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="continuousListening"
                  checked={settings.continuousListening}
                  onChange={(e) => setSettings(prev => ({ ...prev, continuousListening: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="continuousListening" className="text-sm font-medium">
                  Escuta contínua
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Palavra de ativação:</label>
                <input
                  type="text"
                  value={settings.wakeWord}
                  onChange={(e) => setSettings(prev => ({ ...prev, wakeWord: e.target.value }))}
                  placeholder="assistente"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transcripts */}
      {recentTranscripts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transcrições Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentTranscripts.map((result, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={cn(
                      'text-xs font-medium',
                      getConfidenceColor(result.confidence)
                    )}>
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm">{result.transcript}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceIO;