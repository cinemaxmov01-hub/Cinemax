import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceAgentProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string) => void;
  onPlayMovie?: (title: string) => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ onNavigate, onSearch, onPlayMovie }) => {
  const { user } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("en");
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          const detectedLang = event.results[0][0].lang || 'en';
          setDetectedLanguage(detectedLang);
          
          setIsListening(false);
          setIsProcessing(true);
          
          await processVoiceCommand(transcript, detectedLang);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setIsProcessing(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Process voice command and execute tools
  const processVoiceCommand = async (command: string, language: string) => {
    try {
      // Call backend for AI processing with tool calling
      const response = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          command,
          language,
          userName: user?.name || 'User'
        }),
      });

      if (!response.ok) {
        throw new Error('Voice agent request failed');
      }

      const data = await response.json();
      
      // Execute the tool/action if returned
      if (data.action) {
        executeTool(data.action);
      }
      
      // Speak the response
      if (data.response) {
        await speakResponse(data.response, language);
      }
    } catch (error) {
      console.error('Voice command processing error:', error);
      const fallbackResponse = language.startsWith('rw') 
        ? "Ntabwo byakunze, wongera mukanya." 
        : "I couldn't process that, please try again.";
      await speakResponse(fallbackResponse, language);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute tool/action
  const executeTool = (action: any) => {
    switch (action.type) {
      case 'navigate':
        if (onNavigate && action.page) {
          onNavigate(action.page);
        }
        break;
      case 'search':
        if (onSearch && action.query) {
         onSearch(action.query);
        }
        break;
      case 'play_movie':
        if (onPlayMovie && action.title) {
          onPlayMovie(action.title);
        }
        break;
      case 'update_profile':
        // Profile update logic would go here
        console.log('Profile update requested:', action);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Speak response using TTS
  const speakResponse = async (text: string, language: string) => {
    if (!text.trim()) return;

    try {
      setIsSpeaking(true);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          text: text.replace(/[*_`]/g, ''), // Remove markdown symbols for TTS
          language 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.includes('OPENAI_API_KEY')) {
          console.warn('Voice features require OPENAI_API_KEY to be configured');
          // Silently fail without showing error to user
          setIsSpeaking(false);
          return;
        }
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    // Play welcome message on first click
    if (!hasPlayedWelcome) {
      setHasPlayedWelcome(true);
      speakResponse("Welcome to Cinemax. What do you want?", "en");
      // Start listening after welcome message
      setTimeout(() => {
        recognitionRef.current.lang = detectedLanguage;
        recognitionRef.current.start();
      }, 3000);
      return;
    }

    if (isListening || isProcessing) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = detectedLanguage;
      recognitionRef.current.start();
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div className="relative group">
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`relative h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-105 ${
            isListening 
              ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-pulse' 
              : isProcessing
              ? 'bg-gradient-to-br from-[#39FF14]/10 to-[#39FF14]/5 border-2 border-[#39FF14]/40 text-[#39FF14] shadow-[0_0_25px_rgba(57,255,20,0.3)]'
              : 'bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 border border-white/20 hover:border-[#39FF14]/50 text-neutral-400 hover:text-white shadow-lg hover:shadow-[0_0_20px_rgba(57,255,20,0.2)]'
          }`}
          title={isListening ? "Listening..." : isProcessing ? "Processing..." : "Voice Assistant"}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          
          {/* Ripple effect when listening */}
          {isListening && (
            <span className="absolute inset-0 rounded-2xl bg-red-500/20 animate-ping" />
          )}
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 backdrop-blur-sm rounded-lg text-[10px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
          {isListening ? "Listening..." : isProcessing ? "Processing..." : "Voice Assistant"}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
        </div>
        
        {/* Status indicator */}
        {(isListening || isProcessing) && (
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0a0a0a] ${
            isListening ? 'bg-red-500 animate-pulse' : 'bg-[#39FF14] animate-pulse'
          }" />
        )}
      </div>
      <audio ref={audioRef} className="hidden" />
    </>
  );
};
