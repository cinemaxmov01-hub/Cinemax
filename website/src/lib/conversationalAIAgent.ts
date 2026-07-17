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
 * Supported languages with their ISO codes and TTS voices - Expanded to 25+ languages
 */
export const SUPPORTED_LANGUAGES = {
  kinyarwanda: { code: 'rw', name: 'Kinyarwanda', ttsVoice: 'rw-RW' },
  english: { code: 'en', name: 'English', ttsVoice: 'en-US' },
  french: { code: 'fr', name: 'French', ttsVoice: 'fr-FR' },
  spanish: { code: 'es', name: 'Spanish', ttsVoice: 'es-ES' },
  german: { code: 'de', name: 'German', ttsVoice: 'de-DE' },
  italian: { code: 'it', name: 'Italian', ttsVoice: 'it-IT' },
  portuguese: { code: 'pt', name: 'Portuguese', ttsVoice: 'pt-PT' },
  russian: { code: 'ru', name: 'Russian', ttsVoice: 'ru-RU' },
  japanese: { code: 'ja', name: 'Japanese', ttsVoice: 'ja-JP' },
  korean: { code: 'ko', name: 'Korean', ttsVoice: 'ko-KR' },
  chinese: { code: 'zh', name: 'Chinese', ttsVoice: 'zh-CN' },
  arabic: { code: 'ar', name: 'Arabic', ttsVoice: 'ar-SA' },
  hindi: { code: 'hi', name: 'Hindi', ttsVoice: 'hi-IN' },
  dutch: { code: 'nl', name: 'Dutch', ttsVoice: 'nl-NL' },
  polish: { code: 'pl', name: 'Polish', ttsVoice: 'pl-PL' },
  turkish: { code: 'tr', name: 'Turkish', ttsVoice: 'tr-TR' },
  vietnamese: { code: 'vi', name: 'Vietnamese', ttsVoice: 'vi-VN' },
  thai: { code: 'th', name: 'Thai', ttsVoice: 'th-TH' },
  swedish: { code: 'sv', name: 'Swedish', ttsVoice: 'sv-SE' },
  norwegian: { code: 'no', name: 'Norwegian', ttsVoice: 'no-NO' },
  danish: { code: 'da', name: 'Danish', ttsVoice: 'da-DK' },
  finnish: { code: 'fi', name: 'Finnish', ttsVoice: 'fi-FI' },
  greek: { code: 'el', name: 'Greek', ttsVoice: 'el-GR' },
  hebrew: { code: 'he', name: 'Hebrew', ttsVoice: 'he-IL' },
  ukrainian: { code: 'uk', name: 'Ukrainian', ttsVoice: 'uk-UA' },
  czech: { code: 'cs', name: 'Czech', ttsVoice: 'cs-CZ' },
  romanian: { code: 'ro', name: 'Romanian', ttsVoice: 'ro-RO' },
  hungarian: { code: 'hu', name: 'Hungarian', ttsVoice: 'hu-HU' },
  indonesian: { code: 'id', name: 'Indonesian', ttsVoice: 'id-ID' },
  malay: { code: 'ms', name: 'Malay', ttsVoice: 'ms-MY' },
  bengali: { code: 'bn', name: 'Bengali', ttsVoice: 'bn-BD' },
} as const;

/**
 * Language detection patterns for common phrases - Expanded for 30+ languages
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
  german: [
    /\b(hallo|danke|bitte|suche|finde|spiele)\b/i,
    /\b(der|die|das|ein|eine|ist|sind|war)\b/i,
  ],
  italian: [
    /\b(ciao|grazie|per favore|cerca|trova|gioca)\b/i,
    /\b(il|la|lo|un|una|è|sono|era)\b/i,
  ],
  portuguese: [
    /\b(olá|obrigado|por favor|procure|encontre|reproduza)\b/i,
    /\b(o|a|os|as|um|uma|é|são|era)\b/i,
  ],
  russian: [
    /\b(привет|спасибо|пожалуйста|поиск|найди|воспроизведи)\b/i,
    /\b(это|это|в|на|и|или)\b/i,
  ],
  japanese: [
    /\b(こんにちは|ありがとう|お願いします|検索|見つけて|再生)\b/i,
    /\b(は|が|を|に|の|です)\b/i,
  ],
  korean: [
    /\b(안녕하세요|감사합니다|부탁합니다|검색|찾아|재생)\b/i,
    /\b(이|가|을|를|에|의|입니다)\b/i,
  ],
  chinese: [
    /\b(你好|谢谢|请|搜索|找|播放)\b/i,
    /\b(的|了|是|在|和|或)\b/i,
  ],
  arabic: [
    /\b(مرحبا|شكرا|من فضلك|بحث|جد|تشغيل)\b/i,
    /\b(في|على|من|إلى|و|أو)\b/i,
  ],
  hindi: [
    /\b(नमस्ते|धन्यवाद|कृपया|खोजें|खोजें|चलाएं)\b/i,
    /\b(का|की|के|में|पर|और)\b/i,
  ],
  dutch: [
    /\b(hallo|dank je|alsjeblieft|zoek|vind|speel)\b/i,
    /\b(de|het|een|is|zijn|was)\b/i,
  ],
  polish: [
    /\b(cześć|dziękuję|proszę|szukaj|znajdź|odtwórz)\b/i,
    /\b(ten|ta|to|jest|są|był)\b/i,
  ],
  turkish: [
    /\b(merhaba|teşekkürler|lütfen|ara|bul|oynat)\b/i,
    /\b(bu|bu|bir|var|vardı|ve)\b/i,
  ],
  vietnamese: [
    /\b(xin chào|cảm ơn|làm ơn|tìm kiếm|tìm|phát)\b/i,
    /\b(của|là|ở|và|hoặc)\b/i,
  ],
  thai: [
    /\b(สวัสดี|ขอบคุณ|กรุณา|ค้นหา|หา|เล่น)\b/i,
    /\b(ของ|เป็น|ที่|และ|หรือ)\b/i,
  ],
  swedish: [
    /\b(hej|tack|vänligen|sök|hitta|spela)\b/i,
    /\b(det|det|en|är|var|och)\b/i,
  ],
  norwegian: [
    /\b(hei|takk|vennligst|søk|finn|spill)\b/i,
    /\b(det|det|en|er|var|og)\b/i,
  ],
  danish: [
    /\b(hej|tak|venligst|søg|find|afspil)\b/i,
    /\b(det|det|en|er|var|og)\b/i,
  ],
  finnish: [
    /\b(hei|kiitos|ole hyvä|etsi|löydä|toista)\b/i,
    /\b(se|on|oli|ja|tai)\b/i,
  ],
  greek: [
    /\b(γεια|ευχαριστώ|παρακαλώ|αναζήτηση|βρες|παίξε)\b/i,
    /\b(το|το|ένας|είναι|ήταν|και)\b/i,
  ],
  hebrew: [
    /\b(שלום|תודה|בבקשה|חפש|מצא|נגן)\b/i,
    /\b(של|ב|על|ואו)\b/i,
  ],
  ukrainian: [
    /\b(привіт|дякую|будь ласка|пошук|знайди|відтворити)\b/i,
    /\b(це|в|на|і|або)\b/i,
  ],
  czech: [
    /\b(ahoj|děkuji|prosím|hledej|najdi|přehrát)\b/i,
    /\b(ten|to|je|byl|a|nebo)\b/i,
  ],
  romanian: [
    /\b(salut|mulțumesc|te rog|caută|găsește|redă)\b/i,
    /\b(acel|acea|este|era|și|sau)\b/i,
  ],
  hungarian: [
    /\b(szia|köszönöm|kérem|keress|találd|lejátsz)\b/i,
    /\b(az|az|egy|van|volt|és)\b/i,
  ],
  indonesian: [
    /\b(halo|terima kasih|tolong|cari|temukan|putar)\b/i,
    /\b(itu|itu|sebuah|adalah|adalah|dan)\b/i,
  ],
  malay: [
    /\b(halo|terima kasih|sila|cari|cari|main)\b/i,
    /\b(itu|itu|sebuah|adalah|adalah|dan)\b/i,
  ],
  bengali: [
    /\b(হ্যালো|ধন্যবাদ|অনুগ্রহ করে|অনুসন্ধান|খুঁজুন|চালান)\b/i,
    /\b(এর|একটি|হয়|ছিল|এবং)\b/i,
  ],
};

/**
 * Conversational responses for different scenarios - Expanded for 30+ languages
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
  german: {
    welcome: "Willkommen bei Cinemax. Ich bin Ihr KI-Sprachassistent. Ich kann Ihnen helfen, Filme, TV-Serien zu finden oder den Inhalt zu erklären. Was soll ich für Sie suchen?",
    unknown: "Ich erkenne, dass Sie Deutsch sprechen, aber ich habe noch keine Daten zu diesem Thema. Lassen Sie mich etwas Ähnliches für Sie finden.",
    searching: "Ich suche...",
    found: "Ich habe mehrere Ergebnisse gefunden. Hier sind sie:",
    notFound: "Ich konnte nicht finden, was Sie suchen. Soll ich nach etwas anderem suchen?",
    error: "Es gab einen Fehler. Bitte versuchen Sie es erneut.",
  },
  italian: {
    welcome: "Benvenuto su Cinemax. Sono il tuo assistente vocale AI. Posso aiutarti a trovare film, serie TV o spiegare il contenuto. Cosa vorresti che cerchi?",
    unknown: "Riconosco che stai parlando italiano, ma non ho ancora dati su questo argomento. Lasciami trovare qualcosa di simile per te.",
    searching: "Sto cercando...",
    found: "Ho trovato diversi risultati. Eccoli qui:",
    notFound: "Non ho trovato quello che cerchi. Vuoi che cerchi qualcos'altro?",
    error: "C'è stato un errore. Per favore riprova.",
  },
  portuguese: {
    welcome: "Bem-vindo ao Cinemax. Sou seu assistente de voz AI. Posso ajudá-lo a encontrar filmes, séries de TV ou explicar o conteúdo. O que você gostaria que eu pesquisasse?",
    unknown: "Reconheço que você está falando português, mas ainda não tenho dados sobre esse tópico. Deixe-me encontrar algo semelhante para você.",
    searching: "Estou pesquisando...",
    found: "Encontrei vários resultados. Aqui estão eles:",
    notFound: "Não consegui encontrar o que você está procurando. Gostaria que eu pesquisasse algo mais?",
    error: "Houve um erro. Por favor, tente novamente.",
  },
  russian: {
    welcome: "Добро пожаловать в Cinemax. Я ваш голосовой ИИ-ассистент. Я могу помочь вам найти фильмы, телешоу или объяснить содержание. Что вы хотите, чтобы я искал?",
    unknown: "Я узнаю, что вы говорите по-русски, но у меня еще нет данных по этой теме. Позвольте мне найти что-то похожее для вас.",
    searching: "Я ищу...",
    found: "Я нашел несколько результатов. Вот они:",
    notFound: "Я не смог найти то, что вы ищете. Хотите, чтобы я искал что-то еще?",
    error: "Произошла ошибка. Пожалуйста, попробуйте снова.",
  },
  japanese: {
    welcome: "Cinemaxへようこそ。私はAI音声アシスタントです。映画、TV番組を見つけたり、コンテンツを説明したりできます。何を検索すればよいですか？",
    unknown: "日本語を話していることがわかりますが、このトピックについてはまだデータがありません。似たようなものを見つけてみましょう。",
    searching: "検索中...",
    found: "複数の結果が見つかりました。こちらです:",
    notFound: "お探しのものが見つかりませんでした。他に何か検索しましょうか？",
    error: "エラーが発生しました。もう一度お試しください。",
  },
  korean: {
    welcome: "Cinemax에 오신 것을 환영합니다. 저는 AI 음성 어시스턴트입니다. 영화, TV 프로그램을 찾거나 콘텐츠를 설명할 수 있습니다. 무엇을 검색하시겠습니까?",
    unknown: "한국어를 사용하고 계신 것으로 인식되지만, 이 주제에 대한 데이터가 아직 없습니다. 비슷한 것을 찾아보겠습니다.",
    searching: "검색 중...",
    found: "여러 결과를 찾았습니다. 여기 있습니다:",
    notFound: "찾으시는 것을 찾을 수 없었습니다. 다른 것을 검색하시겠습니까?",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
  },
  chinese: {
    welcome: "欢迎来到Cinemax。我是您的AI语音助手。我可以帮您找电影、电视节目或解释内容。您想让我搜索什么？",
    unknown: "我识别出您在说中文，但我还没有关于这个主题的数据。让我为您找一些类似的内容。",
    searching: "正在搜索...",
    found: "我找到了几个结果。在这里:",
    notFound: "我找不到您要找的内容。您想让我搜索其他内容吗？",
    error: "出现错误。请再试一次。",
  },
  arabic: {
    welcome: "مرحباً بك في Cinemax. أنا مساعدك الصوتي بالذكاء الاصطناعي. يمكنني مساعدتك في العثور على الأفلام أو البرامج التلفزيونية أو شرح المحتوى. ماذا تريد مني أن أبحث؟",
    unknown: "أدرك أنك تتحدث العربية، لكن ليس لدي بيانات حول هذا الموضوع بعد. دعني أجد شيئًا مشابهًا لك.",
    searching: "أنا أبحث...",
    found: "وجدت عدة نتائج. إليك:",
    notFound: "لم أتمكن من العثور على ما تبحث عنه. هل تريد مني البحث عن شيء آخر؟",
    error: "حدث خطأ. يرجى المحاولة مرة أخرى.",
  },
  hindi: {
    welcome: "Cinemax में आपका स्वागत है। मैं आपका AI वॉइस असिस्टेंट हूं। मैं आपको फिल्में, टीवी शो खोजने या सामग्री की व्याख्या करने में मदद कर सकता हूं। आप चाहेंगे कि मैं क्या खोजूं?",
    unknown: "मैं पहचानता हूं कि आप हिंदी बोल रहे हैं, लेकिन मेरे पास इस विषय पर अभी तक डेटा नहीं है। आइए आपके लिए कुछ समान खोजें।",
    searching: "मैं खोज रहा हूं...",
    found: "मुझे कई परिणाम मिले। यहाँ हैं:",
    notFound: "मैं वह नहीं ढूंढ पाया जो आप ढूंढ रहे हैं। क्या आप चाहेंगे कि मैं कुछ और खोजूं?",
    error: "एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
  },
  dutch: {
    welcome: "Welkom bij Cinemax. Ik ben uw AI-spraakassistent. Ik kan u helpen bij het vinden van films, tv-programma's of het uitleggen van de inhoud. Wat wilt u dat ik zoek?",
    unknown: "Ik herken dat u Nederlands spreekt, maar ik heb nog geen gegevens over dit onderwerp. Laat mij iets soortgelijks voor u vinden.",
    searching: "Ik ben aan het zoeken...",
    found: "Ik heb meerdere resultaten gevonden. Hier zijn ze:",
    notFound: "Ik kon niet vinden wat u zocht. Wilt u dat ik naar iets anders zoek?",
    error: "Er is een fout opgetreden. Probeer het opnieuw.",
  },
  polish: {
    welcome: "Witamy w Cinemax. Jestem Twoim asystentem głosowym AI. Mogę pomóc Ci znaleźć filmy, programy telewizyjne lub wyjaśnić treść. Co mam dla Ciebie wyszukać?",
    unknown: "Rozpoznaję, że mówisz po polsku, ale nie mam jeszcze danych na ten temat. Pozwól mi znaleźć coś podobnego dla Ciebie.",
    searching: "Wyszukuję...",
    found: "Znalazłem kilka wyników. Oto one:",
    notFound: "Nie mogłem znaleźć tego, czego szukasz. Czy chcesz, abym wyszukał coś innego?",
    error: "Wystąpił błąd. Spróbuj ponownie.",
  },
  turkish: {
    welcome: "Cinemax'a hoş geldiniz. Ben AI sesli asistanınızım. Filmleri, TV programlarını bulmanıza veya içeriği açıklamanıza yardımcı olabilirim. Ne aramamı istersiniz?",
    unknown: "Türkçe konuştuğunuzu tanıyorum, ancak bu konuda henüz verim yok. Sizin için benzer bir şey bulayım.",
    searching: "Arıyorum...",
    found: "Birkaç sonuç buldum. İşte burada:",
    notFound: "Aradığınızı bulamadım. Başka bir şey aramamı ister misiniz?",
    error: "Bir hata oluştu. Lütfen tekrar deneyin.",
  },
  vietnamese: {
    welcome: "Chào mừng đến với Cinemax. Tôi là trợ lý giọng nói AI của bạn. Tôi có thể giúp bạn tìm phim, chương trình TV hoặc giải thích nội dung. Bạn muốn tôi tìm kiếm gì?",
    unknown: "Tôi nhận ra bạn đang nói tiếng Việt, nhưng tôi chưa có dữ liệu về chủ đề này. Để tôi tìm một cái gì đó tương tự cho bạn.",
    searching: "Tôi đang tìm kiếm...",
    found: "Tôi đã tìm thấy một số kết quả. Đây là chúng:",
    notFound: "Tôi không thể tìm thấy những gì bạn đang tìm kiếm. Bạn có muốn tôi tìm kiếm cái gì khác không?",
    error: "Đã xảy ra lỗi. Vui lòng thử lại.",
  },
  thai: {
    welcome: "ยินดีต้อนรับสู่ Cinemax ฉันเป็นผู้ช่วยเสียง AI ของคุณ ฉันสามารถช่วยคุณค้นหาภาพยนตร์ รายการทีวี หรืออธิบายเนื้อหาได้ คุณต้องการให้ฉันค้นหาอะไร?",
    unknown: "ฉันรู้ว่าคุณพูดภาษาไทย แต่ฉันยังไม่มีข้อมูลเกี่ยวกับหัวข้อนี้ ให้ฉันค้นหาสิ่งที่คล้ายกันสำหรับคุณ",
    searching: "ฉันกำลังค้นหา...",
    found: "ฉันพบผลลัพธ์หลายรายการ นี่คือพวกมัน:",
    notFound: "ฉันไม่พบสิ่งที่คุณกำลังมองหา คุณต้องการให้ฉันค้นหาสิ่งอื่นหรือไม่?",
    error: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
  },
  swedish: {
    welcome: "Välkommen till Cinemax. Jag är din AI-röstassistent. Jag kan hjälpa dig att hitta filmer, TV-program eller förklara innehållet. Vad vill du att jag söker efter?",
    unknown: "Jag känner igen att du talar svenska, men jag har inga data om detta ämne än. Låt mig hitta något liknande för dig.",
    searching: "Jag söker...",
    found: "Jag hittade flera resultat. Här är de:",
    notFound: "Jag kunde inte hitta det du letar efter. Vill du att jag söker efter något annat?",
    error: "Det uppstod ett fel. Försök igen.",
  },
  norwegian: {
    welcome: "Velkommen til Cinemax. Jeg er din AI-stemmeassistent. Jeg kan hjelpe deg med å finne filmer, TV-programmer eller forklare innholdet. Hva vil du at jeg skal søke etter?",
    unknown: "Jeg kjenner igjen at du snakker norsk, men jeg har ingen data om dette emnet ennå. La meg finne noe lignende for deg.",
    searching: "Jeg søker...",
    found: "Jeg fant flere resultater. Her er de:",
    notFound: "Jeg kunne ikke finne det du lette etter. Vil du at jeg skal søke etter noe annet?",
    error: "Det oppstod en feil. Prøv igjen.",
  },
  danish: {
    welcome: "Velkommen til Cinemax. Jeg er din AI-stemmeassistent. Jeg kan hjælpe dig med at finde film, TV-programmer eller forklare indholdet. Hvad vil du have, at jeg søger efter?",
    unknown: "Jeg genkender, at du taler dansk, men jeg har ingen data om dette emne endnu. Lad mig finde noget lignende for dig.",
    searching: "Jeg søger...",
    found: "Jeg fandt flere resultater. Her er de:",
    notFound: "Jeg kunne ikke finde det, du ledte efter. Vil du have, at jeg søger efter noget andet?",
    error: "Der opstod en fejl. Prøv igen.",
  },
  finnish: {
    welcome: "Tervetuloa Cinemaxiin. Olen tekoälyääniasiavustajasi. Voin auttaa sinua löytämään elokuvia, TV-ohjelmia tai selittämään sisältöä. Mitä haluat minun etsivän?",
    unknown: "Tunnistan, että puhut suomea, mutta minulla ei ole vielä tietoja tästä aiheesta. Anna minun löytää sinulle jotain vastaavaa.",
    searching: "Etsin...",
    found: "Löysin useita tuloksia. Tässä ne ovat:",
    notFound: "En löytänyt etsimääsi. Haluatko, että etsin jotain muuta?",
    error: "Tapahtui virhe. Yritä uudelleen.",
  },
  greek: {
    welcome: "Καλώς ήρθατε στο Cinemax. Είμαι ο βοηθός φωνής AI σας. Μπορώ να σας βοηθήσω να βρείτε ταινίες, τηλεσπαιχνίδια ή να εξηγήσω το περιεχόμενο. Τι θέλετε να αναζητήσω;",
    unknown: "Αναγνωρίζω ότι μιλάτε ελληνικά, αλλά δεν έχω ακόμη δεδομένα για αυτό το θέμα. Αφήστε με να βρω κάτι παρόμοιο για εσάς.",
    searching: "Αναζητώ...",
    found: "Βρήκα πολλά αποτελέσματα. Εδώ είναι:",
    notFound: "Δεν μπόρεσα να βρω αυτό που ψάχνετε. Θέλετε να αναζητήσω κάτι άλλο;",
    error: "Παρουσιάστηκε σφάλμα. Παρακαλώ προσπαθήστε ξανά.",
  },
  hebrew: {
    welcome: "ברוכים הבאים ל-Cinemax. אני העוזר הקולי שלך בבינה מלאכותית. אני יכול לעזור לך למצוא סרטים, תוכניות טלוויזיה או להסביר את התוכן. מה תרצה שאחפש?",
    unknown: "אני מזהה שאתה מדבר עברית, אבל אין לי עדיין נתונים על נושא זה. תן לי למצוא משהו דומה עבורך.",
    searching: "אני מחפש...",
    found: "מצאתי מספר תוצאות. הנה הן:",
    notFound: "לא הצלחתי למצוא את מה שאתה מחפש. אתה רוצה שאחפש משהו אחר?",
    error: "אירעה שגיאה. אנא נסה שוב.",
  },
  ukrainian: {
    welcome: "Ласкаво просимо до Cinemax. Я ваш голосовий AI-асистент. Я можу допомогти вам знайти фільми, телешоу або пояснити зміст. Що ви хочете, щоб я шукав?",
    unknown: "Я розпізнаю, що ви говорите українською, але у мене ще немає даних з цієї теми. Дозвольте мені знайти щось подібне для вас.",
    searching: "Я шукаю...",
    found: "Я знайшов кілька результатів. Ось вони:",
    notFound: "Я не зміг знайти те, що ви шукаєте. Хочете, щоб я шукав щось інше?",
    error: "Сталася помилка. Будь ласка, спробуйте ще раз.",
  },
  czech: {
    welcome: "Vítejte v Cinemaxu. Jsem váš AI hlasový asistent. Mohu vám pomoci najít filmy, TV pořady nebo vysvětlit obsah. Co chcete, abych hledal?",
    unknown: "Rozpoznávám, že mluvíte česky, ale ještě nemám data o tomto tématu. Nechte mě najít něco podobného pro vás.",
    searching: "Hledám...",
    found: "Našel jsem několik výsledků. Zde jsou:",
    notFound: "Nepodařilo se mi najít to, co hledáte. Chcete, abych hledal něco jiného?",
    error: "Došlo k chybě. Zkuste to prosím znovu.",
  },
  romanian: {
    welcome: "Bine ați venit la Cinemax. Sunt asistentul tău vocal AI. Te pot ajuta să găsești filme, emisiuni TV sau să explic conținutul. Ce dorești să caut?",
    unknown: "Recunosc că vorbești românește, dar nu am încă date despre acest subiect. Lasă-mă să găsesc ceva similar pentru tine.",
    searching: "Caut...",
    found: "Am găsit mai multe rezultate. Iată-le:",
    notFound: "Nu am reușit să găsesc ceea ce cauți. Dorești să caut altceva?",
    error: "A apărut o eroare. Vă rugăm să încercați din nou.",
  },
  hungarian: {
    welcome: "Üdvözöljük a Cinemaxban. Én az AI hangasszisztens vagyok. Segíthetek filmeket, TV műsorokat találni vagy tartalmat magyarázni. Mit szeretne, hogy keressek?",
    unknown: "Felismerem, hogy magyarul beszél, de még nincsenek adataim erről a témáról. Hadd találjak hasonlót az Ön számára.",
    searching: "Keresek...",
    found: "Több találatot találtam. Itt vannak:",
    notFound: "Nem találtam meg, amit keres. Szeretné, hogy mást keressek?",
    error: "Hiba történt. Kérem, próbálja újra.",
  },
  indonesian: {
    welcome: "Selamat datang di Cinemax. Saya adalah asisten suara AI Anda. Saya dapat membantu Anda menemukan film, acara TV, atau menjelaskan konten. Apa yang ingin saya cari?",
    unknown: "Saya mengenali bahwa Anda berbicara bahasa Indonesia, tetapi saya belum memiliki data tentang topik ini. Biarkan saya menemukan sesuatu yang serupa untuk Anda.",
    searching: "Saya sedang mencari...",
    found: "Saya menemukan beberapa hasil. Inilah mereka:",
    notFound: "Saya tidak dapat menemukan yang Anda cari. Apakah Anda ingin saya mencari yang lain?",
    error: "Terjadi kesalahan. Silakan coba lagi.",
  },
  malay: {
    welcome: "Selamat datang ke Cinemax. Saya adalah pembantu suara AI anda. Saya boleh membantu anda mencari filem, rancangan TV atau menerangkan kandungan. Apa yang anda mahu saya cari?",
    unknown: "Saya mengesan bahawa anda bercakap bahasa Melayu, tetapi saya belum mempunyai data tentang topik ini. Biarkan saya mencari sesuatu yang serupa untuk anda.",
    searching: "Saya sedang mencari...",
    found: "Saya menemui beberapa keputusan. Inilah mereka:",
    notFound: "Saya tidak dapat menemui apa yang anda cari. Adakah anda mahu saya mencari yang lain?",
    error: "Berlaku ralat. Sila cuba lagi.",
  },
  bengali: {
    welcome: "Cinemax-এ স্বাগতম. আমি আপনার AI ভয়েস অ্যাসিস্ট্যান্ট। আমি আপনাকে সিনেমা, টিভি শো খুঁজে পেতে বা বিষয়বস্তু ব্যাখ্যা করতে সাহায্য করতে পারি। আপনি কী খুঁজতে চান?",
    unknown: "আমি বুঝতে পারছি আপনি বাংলায় কথা বলছেন, কিন্তু এই বিষয়ে আমার কাছে এখনও কোনো তথ্য নেই। আমাকে আপনার জন্য কিছু অনুরূপ খুঁজে বের করতে দিন।",
    searching: "আমি খুঁজছি...",
    found: "আমি বেশ কয়েকটি ফলাফল পেয়েছি। এগুলি এখানে:",
    notFound: "আমি আপনি যা খুঁজছেন তা খুঁজে পাইনি। আপনি কি চান আমি অন্য কিছু খুঁজি?",
    error: "একটি ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
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

      // Call interim transcript callback for real-time display
      if (interimTranscript && this.onInterimTranscriptCallback) {
        this.onInterimTranscriptCallback(interimTranscript);
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
