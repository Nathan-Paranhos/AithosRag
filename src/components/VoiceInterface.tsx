// Voice Interface Component - Advanced Voice Input/Output
// Speech recognition, text-to-speech, voice commands, multilingual support

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Settings, Languages, Zap, Activity, AlertCircle, CheckCircle, Clock, RotateCcw } from 'lucide-react';

interface VoiceCommand {
  id: string;
  phrase: string;
  action: string;
  description: string;
  enabled: boolean;
  confidence: number;
  category: 'navigation' | 'action' | 'query' | 'control';
}

interface VoiceSession {
  id: string;
  startTime: number;
  endTime?: number;
  transcript: string;
  confidence: number;
  language: string;
  commands: VoiceCommand[];
  audioBlob?: Blob;
}

interface VoiceSettings {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;
  autoSpeak: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  voiceIndex: number;
  noiseReduction: boolean;
  echoCancellation: boolean;
}

interface VoiceAnalytics {
  totalSessions: number;
  totalDuration: number;
  avgConfidence: number;
  commandsExecuted: number;
  languagesUsed: string[];
  errorRate: number;
  mostUsedCommands: { command: string; count: number }[];
}

const VoiceInterface: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [currentSession, setCurrentSession] = useState<VoiceSession | null>(null);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'interface' | 'commands' | 'sessions' | 'settings' | 'analytics'>('interface');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    confidenceThreshold: 0.7,
    autoSpeak: false,
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 1.0,
    voiceIndex: 0,
    noiseReduction: true,
    echoCancellation: true
  });
  
  const [commands] = useState<VoiceCommand[]>([
    {
      id: '1',
      phrase: 'open dashboard',
      action: 'navigate:/dashboard',
      description: 'Navigate to the main dashboard',
      enabled: true,
      confidence: 0.9,
      category: 'navigation'
    },
    {
      id: '2',
      phrase: 'start recording',
      action: 'record:start',
      description: 'Begin voice recording',
      enabled: true,
      confidence: 0.85,
      category: 'control'
    },
    {
      id: '3',
      phrase: 'stop recording',
      action: 'record:stop',
      description: 'Stop voice recording',
      enabled: true,
      confidence: 0.85,
      category: 'control'
    },
    {
      id: '4',
      phrase: 'search for *',
      action: 'search:query',
      description: 'Perform a search query',
      enabled: true,
      confidence: 0.8,
      category: 'query'
    },
    {
      id: '5',
      phrase: 'create new document',
      action: 'create:document',
      description: 'Create a new document',
      enabled: true,
      confidence: 0.9,
      category: 'action'
    },
    {
      id: '6',
      phrase: 'save document',
      action: 'save:document',
      description: 'Save the current document',
      enabled: true,
      confidence: 0.9,
      category: 'action'
    },
    {
      id: '7',
      phrase: 'what time is it',
      action: 'query:time',
      description: 'Get current time',
      enabled: true,
      confidence: 0.95,
      category: 'query'
    },
    {
      id: '8',
      phrase: 'switch to dark mode',
      action: 'theme:dark',
      description: 'Switch to dark theme',
      enabled: true,
      confidence: 0.9,
      category: 'control'
    }
  ]);
  
  const [analytics, setAnalytics] = useState<VoiceAnalytics>({
    totalSessions: 47,
    totalDuration: 3420000, // milliseconds
    avgConfidence: 0.87,
    commandsExecuted: 156,
    languagesUsed: ['en-US', 'es-ES', 'fr-FR'],
    errorRate: 0.08,
    mostUsedCommands: [
      { command: 'search for *', count: 34 },
      { command: 'open dashboard', count: 28 },
      { command: 'create new document', count: 21 },
      { command: 'save document', count: 19 },
      { command: 'what time is it', count: 15 }
    ]
  });
  
  // Initialize speech recognition and synthesis
  useEffect(() => {
    const initializeVoiceInterface = () => {
      // Check for speech recognition support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechSynthesis = window.speechSynthesis;
      
      if (SpeechRecognition && speechSynthesis) {
        setIsSupported(true);
        
        // Initialize recognition
        recognitionRef.current = new SpeechRecognition();
        synthRef.current = speechSynthesis;
        
        // Configure recognition
        const recognition = recognitionRef.current;
        recognition.continuous = settings.continuous;
        recognition.interimResults = settings.interimResults;
        recognition.lang = settings.language;
        recognition.maxAlternatives = settings.maxAlternatives;
        
        // Recognition event handlers
        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
          const session: VoiceSession = {
            id: Date.now().toString(),
            startTime: Date.now(),
            transcript: '',
            confidence: 0,
            language: settings.language,
            commands: []
          };
          setCurrentSession(session);
        };
        
        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          let maxConfidence = 0;
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence;
            
            if (result.isFinal) {
              finalTranscript += transcript;
              maxConfidence = Math.max(maxConfidence, confidence);
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            setConfidence(maxConfidence);
            processVoiceCommand(finalTranscript, maxConfidence);
          }
          
          setInterimTranscript(interimTranscript);
        };
        
        recognition.onerror = (event) => {
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          
          if (currentSession) {
            const updatedSession = {
              ...currentSession,
              endTime: Date.now(),
              transcript: transcript
            };
            setSessions(prev => [updatedSession, ...prev.slice(0, 49)]); // Keep last 50 sessions
            setCurrentSession(null);
          }
        };
        
        // Load available voices
        const loadVoices = () => {
          const voices = speechSynthesis.getVoices();
          setAvailableVoices(voices);
        };
        
        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
        
      } else {
        setIsSupported(false);
        setError('Speech recognition or synthesis not supported in this browser');
      }
    };
    
    initializeVoiceInterface();
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [settings.language, settings.continuous, settings.interimResults, settings.maxAlternatives]);
  
  // Process voice commands
  const processVoiceCommand = useCallback((transcript: string, confidence: number) => {
    if (confidence < settings.confidenceThreshold) return;
    
    const lowerTranscript = transcript.toLowerCase().trim();
    
    for (const command of commands) {
      if (!command.enabled) continue;
      
      const pattern = command.phrase.toLowerCase().replace(/\*/g, '(.+)');
      const regex = new RegExp(`^${pattern}$`);
      const match = lowerTranscript.match(regex);
      
      if (match) {
        executeVoiceCommand(command, match.slice(1));
        break;
      }
    }
  }, [commands, settings.confidenceThreshold]);
  
  // Execute voice command
  const executeVoiceCommand = (command: VoiceCommand, params: string[]) => {
    console.log(`Executing command: ${command.action}`, params);
    
    switch (command.action) {
      case 'navigate:/dashboard': {
        // Navigate to dashboard
        speak('Opening dashboard');
        break;
      }
      case 'record:start':
        startListening();
        break;
      case 'record:stop': {
        speak('Recording stopped');
        break;
      }
      case 'search:query':
        if (params[0]) {
          speak(`Searching for ${params[0]}`);
          // Perform search
        }
        break;
      case 'create:document':
        speak('Creating new document');
        // Create document
        break;
      case 'save:document':
        speak('Document saved');
        // Save document
        break;
      case 'query:time': {
        const now = new Date();
        speak(`The current time is ${now.toLocaleTimeString()}`);
        break;
      }
      case 'theme:dark':
        speak('Switching to dark mode');
        // Switch theme
        break;
      default:
        speak('Command not recognized');
    }
    
    // Update analytics
    setAnalytics(prev => ({
      ...prev,
      commandsExecuted: prev.commandsExecuted + 1
    }));
  };
  
  // Speech synthesis
  const speak = useCallback((text: string) => {
    if (!synthRef.current || !availableVoices.length) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = availableVoices[settings.voiceIndex] || availableVoices[0];
    utterance.rate = settings.speechRate;
    utterance.pitch = settings.speechPitch;
    utterance.volume = settings.speechVolume;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
  }, [availableVoices, settings]);
  
  // Voice control functions
  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    
    try {
      recognitionRef.current.start();
    } catch {
      setError('Failed to start speech recognition');
    }
  };
  
  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return;
    
    recognitionRef.current.stop();
  };
  
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };
  
  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  };
  
  // Settings handlers
  const updateSettings = (newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return '🧭';
      case 'action': return '⚡';
      case 'query': return '❓';
      case 'control': return '🎛️';
      default: return '💬';
    }
  };
  
  if (!isSupported) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Voice Interface Not Supported</h3>
          <p className="text-gray-500">Your browser doesn't support speech recognition or synthesis.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Voice Interface</h1>
          <p className="text-gray-400">
            Advanced voice input/output with speech recognition and synthesis
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${
              isListening ? 'bg-red-500 animate-pulse' : 
              isSpeaking ? 'bg-blue-500 animate-pulse' : 
              'bg-gray-500'
            }`}></div>
            <span className="text-gray-400">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/5 rounded-xl p-1">
        {[
          { id: 'interface', label: 'Interface', icon: Mic },
          { id: 'commands', label: 'Commands', icon: Zap },
          { id: 'sessions', label: 'Sessions', icon: Clock },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'analytics', label: 'Analytics', icon: Activity }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'interface' | 'commands' | 'sessions' | 'settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Interface Tab */}
      {activeTab === 'interface' && (
        <div className="space-y-6">
          {/* Voice Controls */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>
              
              <button
                onClick={isSpeaking ? stopSpeaking : () => speak(transcript || 'Hello, I am your voice assistant')}
                disabled={isListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isSpeaking
                    ? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
                    : 'bg-green-500 hover:bg-green-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSpeaking ? (
                  <VolumeX className="w-8 h-8 text-white" />
                ) : (
                  <Volume2 className="w-8 h-8 text-white" />
                )}
              </button>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm">
                {isListening ? 'Listening for voice commands...' : 'Click the microphone to start listening'}
              </p>
              {confidence > 0 && (
                <p className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                  Confidence: {(confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
          
          {/* Transcript Display */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Transcript</h3>
              <button
                onClick={clearTranscript}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </button>
            </div>
            
            <div className="min-h-[120px] bg-black/20 rounded-lg p-4 font-mono text-sm">
              {transcript && (
                <div className="text-white mb-2">
                  {transcript}
                </div>
              )}
              {interimTranscript && (
                <div className="text-gray-400 italic">
                  {interimTranscript}
                </div>
              )}
              {!transcript && !interimTranscript && (
                <div className="text-gray-500 italic">
                  Transcript will appear here...
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Commands */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Commands</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {commands.filter(cmd => cmd.enabled).slice(0, 6).map(command => (
                <button
                  key={command.id}
                  onClick={() => speak(command.description)}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-left"
                >
                  <span className="text-xl">{getCategoryIcon(command.category)}</span>
                  <div>
                    <div className="text-white text-sm font-medium">"{command.phrase}"</div>
                    <div className="text-gray-400 text-xs">{command.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Commands Tab */}
      {activeTab === 'commands' && (
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Voice Commands</h3>
            <div className="space-y-3">
              {commands.map(command => (
                <div key={command.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{getCategoryIcon(command.category)}</span>
                    <div>
                      <div className="text-white font-medium">"{command.phrase}"</div>
                      <div className="text-gray-400 text-sm">{command.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                          {command.category}
                        </span>
                        <span className={`text-xs ${getConfidenceColor(command.confidence)}`}>
                          {(command.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => speak(command.description)}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all"
                    >
                      <Play className="w-4 h-4 text-green-400" />
                    </button>
                    <div className={`w-3 h-3 rounded-full ${
                      command.enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No voice sessions recorded yet</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-white font-medium">
                          Session {session.id}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                          {session.language}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {new Date(session.startTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-300 text-sm mb-2">
                      {session.transcript || 'No transcript available'}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Duration: {formatDuration((session.endTime || Date.now()) - session.startTime)}</span>
                      <span className={getConfidenceColor(session.confidence)}>
                        Confidence: {(session.confidence * 100).toFixed(1)}%
                      </span>
                      <span>Commands: {session.commands.length}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recognition Settings */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recognition Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => updateSettings({ language: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                    <option value="it-IT">Italian</option>
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="ja-JP">Japanese</option>
                    <option value="ko-KR">Korean</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confidence Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={settings.confidenceThreshold}
                    onChange={(e) => updateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Continuous Recognition</label>
                  <button
                    onClick={() => updateSettings({ continuous: !settings.continuous })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      settings.continuous ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.continuous ? 'translate-x-6' : 'translate-x-1'
                    }`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Interim Results</label>
                  <button
                    onClick={() => updateSettings({ interimResults: !settings.interimResults })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      settings.interimResults ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.interimResults ? 'translate-x-6' : 'translate-x-1'
                    }`}></div>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Speech Settings */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Speech Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
                  <select
                    value={settings.voiceIndex}
                    onChange={(e) => updateSettings({ voiceIndex: parseInt(e.target.value) })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {availableVoices.map((voice, index) => (
                      <option key={index} value={index}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Speech Rate: {settings.speechRate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={settings.speechRate}
                    onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Speech Pitch: {settings.speechPitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.speechPitch}
                    onChange={(e) => updateSettings({ speechPitch: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Speech Volume: {(settings.speechVolume * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.speechVolume}
                    onChange={(e) => updateSettings({ speechVolume: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Auto Speak Responses</label>
                  <button
                    onClick={() => updateSettings({ autoSpeak: !settings.autoSpeak })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      settings.autoSpeak ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.autoSpeak ? 'translate-x-6' : 'translate-x-1'
                    }`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-blue-400 text-sm font-medium">+12 today</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{analytics.totalSessions}</h3>
              <p className="text-gray-400 text-sm">Total Sessions</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-green-400 text-sm font-medium">avg</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{formatDuration(analytics.totalDuration)}</h3>
              <p className="text-gray-400 text-sm">Total Duration</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-purple-400 text-sm font-medium">{(analytics.avgConfidence * 100).toFixed(0)}%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{analytics.commandsExecuted}</h3>
              <p className="text-gray-400 text-sm">Commands Executed</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Languages className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-yellow-400 text-sm font-medium">{analytics.languagesUsed.length}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{((1 - analytics.errorRate) * 100).toFixed(1)}%</h3>
              <p className="text-gray-400 text-sm">Success Rate</p>
            </div>
          </div>
          
          {/* Most Used Commands */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Most Used Commands</h3>
            <div className="space-y-3">
              {analytics.mostUsedCommands.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-blue-400">#{index + 1}</span>
                    <span className="text-white">"{item.command}"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{item.count} uses</span>
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(item.count / analytics.mostUsedCommands[0].count) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;