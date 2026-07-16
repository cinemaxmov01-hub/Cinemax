/**
 * Multilingual Conversational Voice AI Agent
 * Handles dynamic language detection, conversational voice loops, and context management
 */

export interface ConversationContext {
  language: string;
  lastQuery: string;
  lastResults: any[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  currentTopic: string | null;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  detectedText: string;
}

export interface ConversationalResponse {
  text: string;
  language: string;
  shouldSearch: boolean;
  searchQuery?: string;
  action?: 'play' | 'search' | 'explain' | 'navigate';
}

/**
 * Supported languages with their ISO codes and TTS voices
 */
export const SUPPORTED_LANGUAGES = {
  kinyarwanda: { code: 'rw', name: 'Kinyarwanda', ttsVoice: 'rw-RW' },
  english: { code: 'en', name: 'English', ttsVoice: 'en-US' },
  french: { code: 'fr', name: 'French', ttsVoice: 'fr-FR' },
  spanish: { code: 'es', name: 'Spanish', ttsVoice: 'es-ES' },
} as const;

/**
 * Language detection patterns for common phrases
 */
const LANGUAGE_PATTERNS = {
  kinyarwanda: [
    /\b(umva|murakoze|ndabwira|nshakisha|mbega)\b/i,
    /\b(wo|wa|ur|iki|ibi)\b/i,
  ],
  english: [
    /\b(hello|hi|thanks|thank you|please|search|find|play)\b/i,
    /\b(the|a|an|is|are|was|were)\b/i,
  ],
  french: [
    /\b(bonjour|merci|s'il vous plaît|recherche|trouve|joue)\b/i,
    /\b(le|la|les|un|une|est|sont|était)\b/i,
  ],
  spanish: [
    /\b(hola|gracias|por favor|busca|encuentra|reproduce)\b/i,
    /\b(el|la|los|las|un|una|es|son|era)\b/i,
  ],
};

/**
 * Conversational responses for different scenarios
 */
const CONVERSATIONAL_RESPONSES = {
  kinyarwanda: {
    welcome: "Murakaza neza ku Cinemax. Ndi umubwi wanyu w'ikoranabuhanga. Ndashobora kugufasha gushakira amafilimi, amasere, cyangwa gusobanurira ibirimo. Ni nde ushaka ko nshakisha?",
    unknown: "Nabonye ko uvuga Icyarwanda, ariko si n'ibyo ndafite amakuru kuriyo ibyo. Ndashakira ibiri bingana na byo?",
    searching: "Ndi gushakisha...",
    found: "Nabonye ibikorwa byinshi. Dore uko biri:",
    notFound: "Sinabonye ibyo ushakisha. Ushaka ko nshakisha ibindi?",
    error: "Habaye ikibazo. Wakoresheje nanone.",
  },
  english: {
    welcome: "Welcome to Cinemax. I am your AI voice assistant. I can help you find movies, TV shows, or explain the content. What would you like me to search for?",
    unknown: "I recognize you're speaking English, but I don't have data on that topic yet. Let me find something similar for you.",
    searching: "I'm searching...",
    found: "I found several results. Here they are:",
    notFound: "I couldn't find what you're looking for. Would you like me to search for something else?",
    error: "There was an error. Please try again.",
  },
  french: {
    welcome: "Bienvenue sur Cinemax. Je suis votre assistant vocal IA. Je peux vous aider à trouver des films, des séries TV, ou expliquer le contenu. Que voulez-vous que je recherche?",
    unknown: "Je reconnais que vous parlez français, mais je n'ai pas encore de données sur ce sujet. Laissez-moi trouver quelque chose de similaire pour vous.",
    searching: "Je recherche...",
    found: "J'ai trouvé plusieurs résultats. Les voici:",
    notFound: "Je n'ai pas trouvé ce que vous cherchez. Voulez-vous que je recherche autre chose?",
    error: "Il y a eu une erreur. Veuillez réessayer.",
  },
  spanish: {
    welcome: "Bienvenido a Cinemax. Soy tu asistente de voz IA. Puedo ayudarte a encontrar películas, series de TV, o explicar el contenido. ¿Qué te gustaría que busque?",
    unknown: "Reconozco que hablas español, pero aún no tengo datos sobre ese tema. Déjame buscar algo similar para ti.",
    searching: "Estoy buscando...",
    found: "Encontré varios resultados. Aquí están:",
    notFound: "No pude encontrar lo que buscas. ¿Quieres que busque algo más?",
    error: "Hubo un error. Por favor inténtalo de nuevo.",
  },
};

/**
 * Conversational AI Agent Class
 */
export class ConversationalAIAgent {
  private context: ConversationContext;
  private recognition: any = null;
  private isListening: boolean = false;
  private onTranscriptCallback?: (text: string, language: string) => void;
  private onResponseCallback?: (response: ConversationalResponse) => void;

  constructor() {
    this.context = {
      language: 'en',
      lastQuery: '',
      lastResults: [],
      conversationHistory: [],
      currentTopic: null,
    };
  }

  /**
   * Detect language from spoken text using pattern matching
   */
  private detectLanguage(text: string): LanguageDetectionResult {
    const normalizedText = text.toLowerCase();
    let bestMatch = { language: 'en', confidence: 0 };

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          matchCount++;
        }
      }
      const confidence = matchCount / patterns.length;
      if (confidence > bestMatch.confidence) {
        bestMatch = { language: lang, confidence };
      }
    }

    return {
      language: bestMatch.language,
      confidence: bestMatch.confidence,
      detectedText: text,
    };
  }

  /**
   * Initialize speech recognition with multilingual support
   */
  initializeSpeechRecognition(): boolean {
    if (typeof window === 'undefined') return false;
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return false;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const detection = this.detectLanguage(finalTranscript);
        this.context.language = detection.language;
        this.context.lastQuery = finalTranscript;
        
        this.context.conversationHistory.push({
          role: 'user',
          content: finalTranscript,
          timestamp: Date.now(),
        });

        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(finalTranscript, detection.language);
        }

        this.processUserInput(finalTranscript, detection.language);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if it was supposed to be listening
        this.recognition.start();
      }
    };

    return true;
  }

  /**
   * Process user input and generate conversational response
   */
  private processUserInput(input: string, language: string): ConversationalResponse {
    const responses = CONVERSATIONAL_RESPONSES[language as keyof typeof CONVERSATIONAL_RESPONSES] || CONVERSATIONAL_RESPONSES.english;
    
    // Analyze intent
    const lowerInput = input.toLowerCase();
    let response: ConversationalResponse;

    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look for') ||
        lowerInput.includes('gushakisha') || lowerInput.includes('shakisha') ||
        lowerInput.includes('recherche') || lowerInput.includes('trouve') ||
        lowerInput.includes('busca') || lowerInput.includes('encuentra')) {
      
      response = {
        text: responses.searching,
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'search',
      };
    } else if (lowerInput.includes('play') || lowerInput.includes('watch') ||
               lowerInput.includes('reproduce') || lowerInput.includes('joue')) {
      
      response = {
        text: responses.searching,
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'play',
      };
    } else if (lowerInput.includes('explain') || lowerInput.includes('what is') ||
               lowerInput.includes('explain') || lowerInput.includes('qu\'est-ce que') ||
               lowerInput.includes('explica') || lowerInput.includes('qué es')) {
      
      response = {
        text: responses.searching,
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'explain',
      };
    } else {
      // Default to search
      response = {
        text: responses.searching,
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'search',
      };
    }

    this.context.conversationHistory.push({
      role: 'assistant',
      content: response.text,
      timestamp: Date.now(),
    });

    if (this.onResponseCallback) {
      this.onResponseCallback(response);
    }

    return response;
  }

  /**
   * Handle search results and generate appropriate response
   */
  handleSearchResults(results: any[], language: string): ConversationalResponse {
    const responses = CONVERSATIONAL_RESPONSES[language as keyof typeof CONVERSATIONAL_RESPONSES] || CONVERSATIONAL_RESPONSES.english;
    
    this.context.lastResults = results;
    
    let response: ConversationalResponse;
    
    if (results.length > 0) {
      response = {
        text: `${responses.found} ${results.length} ${results.length === 1 ? 'result' : 'results'}.`,
        language,
        shouldSearch: false,
      };
    } else {
      response = {
        text: responses.notFound,
        language,
        shouldSearch: false,
      };
    }

    this.context.conversationHistory.push({
      role: 'assistant',
      content: response.text,
      timestamp: Date.now(),
    });

    return response;
  }

  /**
   * Handle unknown/unindexed data gracefully
   */
  handleUnknownData(query: string, language: string): ConversationalResponse {
    const responses = CONVERSATIONAL_RESPONSES[language as keyof typeof CONVERSATIONAL_RESPONSES] || CONVERSATIONAL_RESPONSES.english;
    
    const languageName = SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES]?.name || language;
    
    const response: ConversationalResponse = {
      text: responses.unknown.replace('[Language]', languageName),
      language,
      shouldSearch: true,
      searchQuery: query, // Try searching anyway
    };

    this.context.conversationHistory.push({
      role: 'assistant',
      content: response.text,
      timestamp: Date.now(),
    });

    return response;
  }

  /**
   * Start listening for voice input
   */
  startListening(): boolean {
    if (!this.recognition) {
      const initialized = this.initializeSpeechRecognition();
      if (!initialized) return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Set transcript callback
   */
  onTranscript(callback: (text: string, language: string) => void): void {
    this.onTranscriptCallback = callback;
  }

  /**
   * Set response callback
   */
  onResponse(callback: (response: ConversationalResponse) => void): void {
    this.onResponseCallback = callback;
  }

  /**
   * Get current context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Reset conversation context
   */
  resetContext(): void {
    this.context = {
      language: 'en',
      lastQuery: '',
      lastResults: [],
      conversationHistory: [],
      currentTopic: null,
    };
  }

  /**
   * Convert text to speech using Web Speech API
   */
  async speak(text: string, language: string = 'en'): Promise<void> {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const langConfig = SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES];
    
    if (langConfig) {
      utterance.lang = langConfig.code;
    }

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(voice => voice.lang.startsWith(langConfig?.code || 'en'));
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    return new Promise((resolve, reject) => {
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopListening();
    if (this.recognition) {
      this.recognition = null;
    }
    this.onTranscriptCallback = undefined;
    this.onResponseCallback = undefined;
  }
}

/**
 * Create singleton instance
 */
let agentInstance: ConversationalAIAgent | null = null;

export const getConversationalAgent = (): ConversationalAIAgent => {
  if (!agentInstance) {
    agentInstance = new ConversationalAIAgent();
  }
  return agentInstance;
};
