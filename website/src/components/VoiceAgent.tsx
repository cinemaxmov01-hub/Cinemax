import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceAgentProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string) => void;
  onPlayMovie?: (title: string) => void;
  onDeleteLastAction?: () => void;
  onOpenCategories?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  onNavigate, 
  onSearch, 
  onPlayMovie, 
  onDeleteLastAction, 
  onOpenCategories, 
  onOpenSettings, 
  onOpenHelp 
}) => {
  const { user } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY = 1500; // 1.5 seconds to wait for user to finish speaking

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US'; // Force English only

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence;
          
          setIsListening(false);
          
          // Only process if transcript has meaningful content (not empty or too short)
          const cleanTranscript = transcript.trim();
          if (cleanTranscript.length < 2) {
            console.log('Voice transcript too short or empty, ignoring');
            setIsProcessing(false);
            return;
          }

          // Filter out low-confidence results to reduce confusion
          if (confidence < 0.5) {
            console.log('Voice recognition confidence too low:', confidence);
            setIsProcessing(false);
            return;
          }
          
          // Filter out common false positives and noise
          const noisePatterns = /^(um|uh|ah|mm|hm|oh|hey|hello|hi|okay|ok|sure|yeah|yes|no|thanks|thank you|please|bye|goodbye|cool|nice|great|awesome|wow|amazing|interesting|really|okay|alright)$/i;
          if (noisePatterns.test(cleanTranscript)) {
            console.log('Voice transcript appears to be noise/conversational filler:', cleanTranscript);
            setIsProcessing(false);
            return;
          }
          
          // Clear any existing debounce timer
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          // Set debounce timer to wait for user to finish speaking
          debounceTimerRef.current = setTimeout(async () => {
            setIsProcessing(true);
            await processVoiceCommand(cleanTranscript, 'en-US');
          }, DEBOUNCE_DELAY);
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Process voice command and execute tools
  const processVoiceCommand = async (command: string, language: string) => {
    try {
      console.log('Processing voice command:', command, 'Language:', language);
      
      // Call backend for AI processing with tool calling
      const response = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          command,
          language: 'en-US', // Force English
          userName: user?.name || 'User'
        }),
      });

      if (!response.ok) {
        throw new Error('Voice agent request failed');
      }

      const data = await response.json();
      console.log('Voice agent response:', data);
      
      // Only execute action if it's valid and not unclear
      if (data.action && data.action.type && data.action.type !== 'unknown') {
        console.log('Executing tool:', data.action);
        executeTool(data.action);
      } else {
        console.log('No valid action returned, likely unclear intent');
      }
      
      // Speak the response only if it exists and is meaningful
      if (data.response && data.response.length > 5) {
        await speakResponse(data.response, 'en-US');
      } else {
        console.log('No meaningful response to speak');
      }
    } catch (error) {
      console.error('Voice command processing error:', error);
      const fallbackResponse = "I couldn't process that, please try again.";
      await speakResponse(fallbackResponse, 'en-US');
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
      case 'deleteLastAction':
        if (onDeleteLastAction) {
          onDeleteLastAction();
        }
        break;
      case 'openCategories':
        if (onOpenCategories) {
          onOpenCategories();
        }
        break;
      case 'openSettings':
        if (onOpenSettings) {
          onOpenSettings();
        }
        break;
      case 'openHelp':
        if (onOpenHelp) {
          onOpenHelp();
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
      
      // Force English TTS voice
      const ttsVoice = "en-US";
      
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
      speakResponse("Welcome to Cinemax. What do you want?", "en-US");
      // Start listening after welcome message
      setTimeout(() => {
        recognitionRef.current.lang = 'en-US';
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          setIsListening(false);
        }
      }, 3000);
      return;
    }

    if (isListening || isProcessing) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = 'en-US';
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
      }
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
