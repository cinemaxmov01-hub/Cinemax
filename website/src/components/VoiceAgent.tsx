import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { SPEECH_LANG_CODES, TTS_VOICE_CODES } from "../i18n/translations";

interface VoiceAgentProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string) => void;
  onPlayMovie?: (title: string) => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ onNavigate, onSearch, onPlayMovie }) => {
  const { user, appLanguage } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(SPEECH_LANG_CODES[appLanguage] || "en-US");
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update detected language when app language changes
  useEffect(() => {
    setDetectedLanguage(SPEECH_LANG_CODES[appLanguage] || "en-US");
  }, [appLanguage]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = SPEECH_LANG_CODES[appLanguage] || "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          const detectedLang = event.results[0][0].lang || SPEECH_LANG_CODES[appLanguage] || "en-US";
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
  }, [appLanguage]);

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
      
      // Map detected language to TTS voice code
      const ttsVoice = language || TTS_VOICE_CODES[appLanguage] || "en-US";
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          text: text.replace(/[*_`]/g, ''), // Remove markdown symbols for TTS
          language: ttsVoice
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
      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${
          isListening 
            ? 'bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse' 
            : isProcessing
            ? 'bg-[#39FF14]/10 border-2 border-[#39FF14]/30 text-[#39FF14]'
            : 'bg-white/5 hover:bg-white/10 border border-white/20 text-neutral-400 hover:text-white'
        }`}
        title={isListening ? "Listening..." : isProcessing ? "Processing..." : "Voice Assistant"}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      <audio ref={audioRef} className="hidden" />
    </>
  );
};
