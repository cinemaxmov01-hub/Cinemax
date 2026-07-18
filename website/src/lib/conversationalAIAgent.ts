/**
 * English-Only Voice AI Agent
 * Handles voice commands with debouncing to prevent premature searches
 */

export interface ConversationContext {
  language: string;
  lastQuery: string;
  lastResults: any[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  currentTopic: string | null;
  isStorytelling: boolean;
  storyContext: string | null;
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
 * Single language support - English only
 */
export const SUPPORTED_LANGUAGES = {
  english: { code: 'en', name: 'English', ttsVoice: 'en-US' },
} as const;

/**
 * English conversational responses
 */
const CONVERSATIONAL_RESPONSES = {
  english: {
    welcome: "Welcome to Cinemax. I am your AI voice assistant. I can help you find movies, TV shows, or explain the content. What would you like me to search for?",
    unknown: "I don't have data on that topic yet. Let me find something similar for you.",
    searching: "I'm searching...",
    found: "I found several results. Here they are:",
    notFound: "I couldn't find what you're looking for. Would you like me to search for something else?",
    error: "There was an error. Please try again.",
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
  private onInterimTranscriptCallback?: (text: string) => void;
  private onResponseCallback?: (response: ConversationalResponse) => void;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay: number = 1500; // 1.5 seconds delay to wait for user to finish speaking

  constructor() {
    this.context = {
      language: 'en',
      lastQuery: '',
      lastResults: [],
      conversationHistory: [],
      currentTopic: null,
      isStorytelling: false,
      storyContext: null,
    };
  }

  /**
   * Initialize speech recognition with English only
   */
  initializeSpeechRecognition(): boolean {
    if (typeof window === 'undefined') return false;
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return false;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = 'en-US'; // Force English only

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

      // Call interim transcript callback for real-time display
      if (interimTranscript && this.onInterimTranscriptCallback) {
        this.onInterimTranscriptCallback(interimTranscript);
      }

      if (finalTranscript) {
        // Clear any existing debounce timer
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        // Set new debounce timer to wait for user to finish speaking
        this.debounceTimer = setTimeout(() => {
          this.context.lastQuery = finalTranscript;
          
          this.context.conversationHistory.push({
            role: 'user',
            content: finalTranscript,
            timestamp: Date.now(),
          });

          if (this.onTranscriptCallback) {
            this.onTranscriptCallback(finalTranscript, 'en');
          }

          this.processUserInput(finalTranscript, 'en');
        }, this.debounceDelay);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      // Only restart if explicitly still listening and not stopped by user
      // This prevents auto-activation issues
      if (this.isListening && !this.recognition.aborted) {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Failed to restart speech recognition:', error);
          this.isListening = false;
        }
      } else {
        this.isListening = false;
      }
    };

    return true;
  }

  /**
   * Process user input and generate conversational response with natural human-like interaction
   */
  private processUserInput(input: string, language: string): ConversationalResponse {
    const responses = CONVERSATIONAL_RESPONSES[language as keyof typeof CONVERSATIONAL_RESPONSES] || CONVERSATIONAL_RESPONSES.english;
    
    // Analyze intent with more natural language understanding
    const lowerInput = input.toLowerCase();
    let response: ConversationalResponse;
    
    // Check for storytelling requests
    if (lowerInput.includes('tell me') || lowerInput.includes('story') || lowerInput.includes('about') ||
        lowerInput.includes('tell me a story') || lowerInput.includes('what\'s the story')) {
      this.context.isStorytelling = true;
      this.context.storyContext = input;
      
      response = {
        text: this.generateStorytellingResponse(input, language),
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'explain',
      };
    }
    // Check for search intent with natural language
    else if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look for') ||
        lowerInput.includes('gushakisha') || lowerInput.includes('shakisha') ||
        lowerInput.includes('recherche') || lowerInput.includes('trouve') ||
        lowerInput.includes('busca') || lowerInput.includes('encuentra') ||
        lowerInput.includes('i want to watch') || lowerInput.includes('show me')) {
      
      response = {
        text: this.generateNaturalResponse(input, 'search', language),
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'search',
      };
    } 
    // Check for play intent
    else if (lowerInput.includes('play') || lowerInput.includes('watch') ||
               lowerInput.includes('reproduce') || lowerInput.includes('joue') ||
               lowerInput.includes('let\'s watch') || lowerInput.includes('i\'d like to see')) {
      
      response = {
        text: this.generateNaturalResponse(input, 'play', language),
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'play',
      };
    } 
    // Check for explanation intent
    else if (lowerInput.includes('explain') || lowerInput.includes('what is') ||
               lowerInput.includes('tell me about') || lowerInput.includes('qu\'est-ce que') ||
               lowerInput.includes('explica') || lowerInput.includes('qué es')) {
      
      response = {
        text: this.generateNaturalResponse(input, 'explain', language),
        language,
        shouldSearch: true,
        searchQuery: input,
        action: 'explain',
      };
    } 
    // Check for conversational responses
    else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey') ||
             lowerInput.includes('how are you') || lowerInput.includes('what\'s up')) {
      
      response = {
        text: this.generateGreetingResponse(language),
        language,
        shouldSearch: false,
        action: 'explain',
      };
    }
    // Default to search with natural response
    else {
      response = {
        text: this.generateNaturalResponse(input, 'search', language),
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
   * Generate natural human-like responses based on context
   */
  private generateNaturalResponse(input: string, intent: string, language: string): string {
    const responses = CONVERSATIONAL_RESPONSES[language as keyof typeof CONVERSATIONAL_RESPONSES] || CONVERSATIONAL_RESPONSES.english;
    
    // Add conversational fillers and natural transitions - more human-like variety
    const fillers: Record<string, string[]> = {
      english: [
        "Let me see...",
        "I'll look that up for you.",
        "Searching now...",
        "One moment...",
        "Let me find that...",
        "I'm on it...",
        "Checking that for you...",
        "Give me a second...",
        "Let me check...",
      ],
      kinyarwanda: [
        "Ndi kureba...",
        "Ndi gushakisha...",
        "Ndi gushakisha...",
        "Impera...",
        "Ndi gushakisha...",
        "Ndi kubikorwa...",
        "Ndi kureba...",
        "Nsubira...",
        "Ndi kureba...",
      ],
      french: [
        "Laissez-moi voir...",
        "Je vais chercher ça pour vous.",
        "Recherche en cours...",
        "Un instant...",
        "Laissez-moi trouver ça...",
        "Je m'en occupe...",
        "Je vérifie ça pour vous...",
        "Donnez-moi une seconde...",
        "Laissez-moi vérifier...",
      ],
      spanish: [
        "Déjame ver...",
        "Voy a buscar eso para ti.",
        "Buscando ahora...",
        "Un momento...",
        "Déjame encontrar eso...",
        "Me encargo de eso...",
        "Verificando eso para ti...",
        "Dame un segundo...",
        "Déjame verificar...",
      ],
      german: [
        "Lass mich sehen...",
        "Ich werde das für dich suchen.",
        "Suche läuft...",
        "Einen Moment...",
        "Lass mich das finden...",
        "Ich kümmere mich darum...",
        "Ich überprüfe das für dich...",
        "Gib mir eine Sekunde...",
        "Lass mich überprüfen...",
      ],
      italian: [
        "Fammi vedere...",
        "Cercherò quello per te.",
        "Ricerca in corso...",
        "Un momento...",
        "Fammi trovare quello...",
        "Me ne occupo...",
        "Controllo quello per te...",
        "Dammi un secondo...",
        "Fammi controllare...",
      ],
      portuguese: [
        "Deixe-me ver...",
        "Vou procurar isso para você.",
        "Pesquisando agora...",
        "Um momento...",
        "Deixe-me encontrar isso...",
        "Estou cuidando disso...",
        "Verificando isso para você...",
        "Me dê um segundo...",
        "Deixe-me verificar...",
      ],
      arabic: [
        "دعني أرى...",
        "سأبحث عن ذلك لك.",
        "جاري البحث...",
        "لحظة واحدة...",
        "دعني أجد ذلك...",
        "أنا أعتني بذلك...",
        "أتحقق من ذلك لك...",
        "أعطني ثانية...",
        "دعني أتحقق...",
      ],
      chinese: [
        "让我看看...",
        "我会为你查找那个。",
        "正在搜索...",
        "稍等...",
        "让我找到那个...",
        "我正在处理...",
        "我为你检查那个...",
        "给我一秒钟...",
        "让我检查...",
      ],
      japanese: [
        "見てみましょう...",
        "それを探してあげます。",
        "検索中...",
        "ちょっと待って...",
        "それを見つけましょう...",
        "私がやります...",
        "それを確認してあげます...",
        "少し待って...",
        "確認してみましょう...",
      ],
      korean: [
        "한번 보게...",
        "그걸 찾아줄게요.",
        "검색 중...",
        "잠시만요...",
        "그걸 찾아보게...",
        "제가 할게요...",
        "그걸 확인해줄게요...",
        "잠시 기다려주세요...",
        "확인해보게...",
      ],
      swahili: [
        "Nichekele kuona...",
        "Nitafuta hiyo kwa ajili yako.",
        "Ninatafuta sasa...",
        "Dakika moja...",
        "Nichekele kupata hiyo...",
        "Ninafanya hilo...",
        "Ninakagua hiyo kwa ajili yako...",
        "Nipe sekunde moja...",
        "Nichekele kukagua...",
      ],
    };
    
    const langFillers = fillers[language] || fillers.english;
    const randomFiller = langFillers[Math.floor(Math.random() * langFillers.length)];
    
    if (intent === 'search') {
      return `${randomFiller} ${responses.searching}`;
    } else if (intent === 'play') {
      const playResponses: Record<string, string[]> = {
        english: ["I'll get that ready for you.", "Let me start that for you.", "I'll set that up right away.", "Coming right up!", "Let me get that playing."],
        kinyarwanda: ["Ndi gutangira.", "Ndi gutangira.", "Ndi gutangira.", "Ndi gutangira.", "Ndi gutangira."],
        french: ["Je vais préparer ça pour vous.", "Laissez-moi démarrer ça pour vous.", "Je vais configurer ça tout de suite.", "Ça arrive tout de suite!", "Laissez-moi mettre ça en lecture."],
        spanish: ["Voy a preparar eso para ti.", "Déjame comenzar eso para ti.", "Voy a configurar eso de inmediato.", "¡Eso viene enseguida!", "Déjame poner eso en reproducción."],
        german: ["Ich werde das für dich vorbereiten.", "Lass mich das für dich starten.", "Ich werde das sofort einrichten.", "Das kommt sofort!", "Lass mich das abspielen."],
        italian: ["Preparerò quello per te.", "Farò partire quello per te.", "Configurerò quello subito.", "Arriva subito!", "Farò riprodurre quello."],
        portuguese: ["Vou preparar isso para você.", "Deixe-me começar isso para você.", "Vou configurar isso imediatamente.", "Isso vem agora!", "Deixe-me colocar isso em reprodução."],
        arabic: ["سأقوم بإعداد ذلك لك.", "دعني أبدأ ذلك لك.", "سأقوم بتكوين ذلك فوراً.", "يأتي ذلك فوراً!", "دعني أشغل ذلك."],
        chinese: ["我会为你准备那个。", "让我为你开始那个。", "我会立即设置那个。", "那个马上就来！", "让我播放那个。"],
        japanese: ["それを準備してあげます。", "それを始めてあげます。", "すぐに設定します。", "すぐ来ます！", "それを再生させてあげます。"],
        korean: ["그걸 준비해줄게요.", "그걸 시작해줄게요.", "바로 설정해줄게요.", "바로 올게요!", "그걸 재생해줄게요."],
        swahili: ["Nitayarudisha hiyo kwa ajili yako.", "Nianze hiyo kwa ajili yako.", "Nitaweka hiyo mara moja.", "Hiyo inakuja sasa!", "Nichekele kuichezesha hiyo."],
      };
      const langPlayResponses = playResponses[language] || playResponses.english;
      const randomPlayResponse = langPlayResponses[Math.floor(Math.random() * langPlayResponses.length)];
      return `${randomFiller} ${randomPlayResponse}`;
    } else if (intent === 'explain') {
      const explainResponses: Record<string, string[]> = {
        english: ["Let me tell you about that.", "I'll explain that for you.", "Here's what I know about that.", "Let me share some details.", "I can tell you more about that."],
        kinyarwanda: ["Ndi kubwira ibyo.", "Ndi gusobanura ibyo.", "Ndi kubwira ibyo nzi.", "Ndi kugira amakuru.", "Ndi kubwira ibyinshi."],
        french: ["Laissez-moi vous parler de ça.", "Je vais vous expliquer ça.", "Voici ce que je sais à ce sujet.", "Laissez-moi partager quelques détails.", "Je peux vous en dire plus à ce sujet."],
        spanish: ["Déjame contarte sobre eso.", "Te explicaré eso.", "Aquí está lo que sé sobre eso.", "Déjame compartir algunos detalles.", "Puedo decirte más sobre eso."],
        german: ["Lass mich dir darüber erzählen.", "Ich werde dir das erklären.", "Hier ist, was ich darüber weiß.", "Lass mir einige Details teilen.", "Ich kann dir mehr darüber erzählen."],
        italian: ["Fammi raccontare di quello.", "Ti spiegherò quello.", "Ecco quello che so su quello.", "Fammi condividere alcuni dettagli.", "Posso dirti di più su quello."],
        portuguese: ["Deixe-me contar sobre isso.", "Vou explicar isso para você.", "Aqui está o que sei sobre isso.", "Deixe-me compartilhar alguns detalhes.", "Posso dizer mais sobre isso."],
        arabic: ["دعني أخبرك عن ذلك.", "سأشرح ذلك لك.", "هذا ما أعرفه عن ذلك.", "دعني شارك بعض التفاصيل.", "يمكنني أن أخبرك المزيد عن ذلك."],
        chinese: ["让我告诉你关于那个。", "我会为你解释那个。", "这是我对那个的了解。", "让我分享一些细节。", "我可以告诉你更多关于那个。"],
        japanese: ["それについて教えてあげます。", "それを説明してあげます。", "それについて私が知っていることを教えます。", "いくつかの詳細を共有させてください。", "それについてもっと教えてあげます。"],
        korean: ["그것에 대해 말해줄게요.", "그것을 설명해줄게요.", "그것에 대해 제가 아는 것을 알려드릴게요.", "몇 가지 세부 사항을 공유해드릴게요.", "그것에 대해 더 말해줄게요."],
        swahili: ["Nikuambie kuhusu hiyo.", "Nitaelezea hiyo kwa ajili yako.", "Hii ndiyo ninayojua kuhusu hiyo.", "Nishiriki maelezo machache.", "Nikuambie zaidi kuhusu hiyo."],
      };
      const langExplainResponses = explainResponses[language] || explainResponses.english;
      const randomExplainResponse = langExplainResponses[Math.floor(Math.random() * langExplainResponses.length)];
      return `${randomFiller} ${randomExplainResponse}`;
    }
    
    return responses.searching;
  }

  /**
   * Generate storytelling responses for narrative requests
   */
  private generateStorytellingResponse(input: string, language: string): string {
    const responses = CONVERSATIONAL_RESPONSES[language as keyof typeof CONVERSATIONAL_RESPONSES] || CONVERSATIONAL_RESPONSES.english;
    
    const storytellingOpeners = [
      "That's a great question! Let me tell you about it...",
      "I'd love to share that story with you...",
      "Here's what I know about that...",
      "Let me paint you a picture...",
      "That's an interesting topic! Here's the story...",
    ];
    
    const randomOpener = storytellingOpeners[Math.floor(Math.random() * storytellingOpeners.length)];
    
    return `${randomOpener} ${responses.searching}`;
  }

  /**
   * Generate natural greeting responses
   */
  private generateGreetingResponse(language: string): string {
    const greetings: Record<string, string[]> = {
      english: [
        "Hello! It's great to hear from you. How can I help you today?",
        "Hi there! I'm here to help you find great content. What would you like to watch?",
        "Hey! Good to see you. What can I help you find today?",
      ],
      spanish: [
        "¡Hola! Es genial saludarte. ¿Cómo puedo ayudarte hoy?",
        "¡Hola! Estoy aquí para ayudarte a encontrar contenido increíble. ¿Qué te gustaría ver?",
      ],
      french: [
        "Bonjour! Ravi de vous entendre. Comment puis-je vous aider aujourd'hui?",
        "Salut! Je suis là pour vous aider à trouver du super contenu. Que voudriez-vous regarder?",
      ],
    };

    const langGreetings = greetings[language] || greetings.english;
    return langGreetings[Math.floor(Math.random() * langGreetings.length)];
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
      this.recognition.aborted = true;
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
   * Set interim transcript callback for real-time display
   */
  onInterimTranscript(callback: (text: string) => void): void {
    this.onInterimTranscriptCallback = callback;
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
      isStorytelling: false,
      storyContext: null,
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
