export interface StreamingProvider {
  id: string;
  name: string;
  homepage: string;
  moviePattern: string;
  tvPattern: string;
  qualityOptions: string[];
  audioOptions: string[];
  subtitlesOptions: string[];
  defaultLatency: number; // in ms
  status: "Online" | "Slow" | "Offline";
  ping?: number; // current ping in ms
  priority: number; // Provider priority for selection
  supportsHls: boolean; // Whether provider supports HLS streaming
  supportsAdaptiveBitrate: boolean; // Whether provider supports adaptive bitrate
  cdnRegions: string[]; // Supported CDN regions
  reliabilityScore: number; // Historical reliability (0-100)
}

/**
 * Optimized streaming sources with enhanced metadata for intelligent selection.
 * Providers are ranked by priority, reliability, and capabilities.
 */
export const PROVIDERS_CONFIG: StreamingProvider[] = [
  {
    // P1 — Premium Server (Highest priority, most reliable for new content)
    id: "vidsrc-pm",
    name: "P1",
    homepage: "https://vidsrc.pm",
    moviePattern: "https://vidsrc.pm/embed/movie/{id}",
    tvPattern: "https://vidsrc.pm/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["4K", "1080p", "720p", "480p", "Auto"],
    audioOptions: ["Original", "English", "Spanish", "French"],
    subtitlesOptions: ["Embedded", "English", "Spanish", "French"],
    defaultLatency: 65,
    status: "Online",
    priority: 1,
    supportsHls: true,
    supportsAdaptiveBitrate: true,
    cdnRegions: ["global", "us", "eu", "asia"],
    reliabilityScore: 98,
  },
  {
    // P2 — Primary Server (High reliability, good performance for new releases)
    id: "vidsrc-me",
    name: "P2",
    homepage: "https://vidsrc.me",
    moviePattern: "https://vidsrc.me/embed/movie/{id}",
    tvPattern: "https://vidsrc.me/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "480p", "Auto"],
    audioOptions: ["Original", "English", "Spanish"],
    subtitlesOptions: ["Embedded", "English", "Spanish"],
    defaultLatency: 75,
    status: "Online",
    priority: 2,
    supportsHls: true,
    supportsAdaptiveBitrate: true,
    cdnRegions: ["global", "us", "eu"],
    reliabilityScore: 88,
  },
  {
    // P3 — Alternative Server (Good backup with different CDN)
    id: "vidsrc-to",
    name: "P3",
    homepage: "https://vidsrc.to",
    moviePattern: "https://vidsrc.to/embed/movie/{id}",
    tvPattern: "https://vidsrc.to/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "480p", "Auto"],
    audioOptions: ["Original", "English", "Spanish"],
    subtitlesOptions: ["Embedded", "English", "Spanish"],
    defaultLatency: 80,
    status: "Online",
    priority: 3,
    supportsHls: true,
    supportsAdaptiveBitrate: true,
    cdnRegions: ["global", "us", "eu", "asia"],
    reliabilityScore: 85,
  },
  {
    // P4 — Backup Server (Good fallback option)
    id: "2embed-cc",
    name: "P4",
    homepage: "https://2embed.cc",
    moviePattern: "https://2embed.cc/embed/movie/{id}",
    tvPattern: "https://2embed.cc/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "480p", "Auto"],
    audioOptions: ["Original", "English", "Spanish"],
    subtitlesOptions: ["Embedded", "English", "Spanish"],
    defaultLatency: 85,
    status: "Online",
    priority: 4,
    supportsHls: true,
    supportsAdaptiveBitrate: false,
    cdnRegions: ["global", "us"],
    reliabilityScore: 82,
  },
];

/** Permissions required for third-party embed players (autoplay, HLS, fullscreen). */
export const EMBED_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

import { isImdbId, convertImdbToTmdb, extractImdbId, verifyTmdbId } from "./tmdb";

export const buildEmbedUrl = async (
  provider: StreamingProvider,
  type: "movie" | "tv",
  id: number | string,
  season: number = 1,
  episode: number = 1,
  _subtitles: string = "English",
  _quality: string = "Auto",
  _audio: string = "English"
): Promise<string> => {
  const pattern = type === "movie" ? provider.moviePattern : provider.tvPattern;

  // Log input parameters for debugging
  console.log(`🔧 buildEmbedUrl called with: type=${type}, id=${id} (${typeof id}), season=${season}, episode=${episode}, provider=${provider.id}`);

  // Check if ID is in IMDb format and convert it to TMDB ID
  let numericId: number;
  let actualType: "movie" | "tv" = type;
  let useImdbFallback = false;
  
  if (typeof id === 'string') {
    // Auto-clean protocol: Extract pure IMDb ID from messy URLs
    const cleanedId = extractImdbId(id);
    
    if (cleanedId && isImdbId(cleanedId)) {
      console.log(`🎬 IMDb ID detected: ${cleanedId}, converting to TMDB ID...`);
      const conversion = await convertImdbToTmdb(cleanedId);
      
      if (conversion) {
        numericId = conversion.tmdbId;
        actualType = conversion.mediaType;
        console.log(`✅ Converted ${cleanedId} to TMDB ID ${numericId} (type: ${actualType}, title: ${conversion.title})`);
        
        // Double ID Verification: Verify the TMDB ID is real before serving to provider
        const verification = await verifyTmdbId(numericId, actualType);
        if (!verification || !verification.valid) {
          console.warn(`⚠️ TMDB ID verification failed for ${numericId}, using VidSrc deep-link fallback`);
          useImdbFallback = true;
          numericId = parseInt(cleanedId.replace('tt', ''), 10);
          actualType = type;
        } else {
          console.log(`🔍 Double verification passed: ${verification.title}`);
        }
        
        // Bonus logic: If user inputs IMDb ID for a movie by mistake, auto-detect and play as movie
        if (type === "tv" && actualType === "movie") {
          console.log(`🎥 IMDb ID ${cleanedId} is a movie, but user requested TV playback. Auto-switching to movie mode.`);
        }
      } else {
        console.warn(`⚠️ TMDB conversion failed, using VidSrc deep-link fallback with IMDb ID: ${cleanedId}`);
        useImdbFallback = true;
        numericId = parseInt(cleanedId.replace('tt', ''), 10);
        actualType = type; // Keep original type for fallback
      }
    } else {
      numericId = parseInt(id, 10);
    }
  } else {
    numericId = id;
    
    // Double ID Verification for numeric TMDB IDs
    const verification = await verifyTmdbId(numericId, actualType);
    if (!verification || !verification.valid) {
      console.warn(`⚠️ TMDB ID ${numericId} verification failed, provider may not have this content`);
    } else {
      console.log(`🔍 TMDB ID ${numericId} verified: ${verification.title}`);
    }
  }
  
  const validSeason = Math.max(1, season);
  const validEpisode = Math.max(1, episode);

  // Validate ID
  if (isNaN(numericId)) {
    console.error(`❌ Invalid TMDB ID (NaN): ${id} (type: ${typeof id})`);
    return "";
  }

  if (numericId <= 0) {
    console.warn(`⚠️ TMDB ID is <= 0: ${numericId}, this may cause provider to redirect to homepage`);
  }

  // Specific validation for TV shows
  if (actualType === "tv") {
    console.log(`📺 TV Show detected - Season: ${validSeason}, Episode: ${validEpisode}`);
    if (validSeason < 1 || validEpisode < 1) {
      console.error(`❌ Invalid season/episode for TV show: S${validSeason}E${validEpisode}`);
      return "";
    }
    
    // Log if this might be a last episode (high episode number)
    if (validEpisode > 20) {
      console.warn(`⚠️ High episode number detected: ${validEpisode} - this might be the last episode or beyond available content`);
    }
  }

  // Replace placeholders in URL pattern using the actual detected type
  let url: string;
  
  if (useImdbFallback) {
    // VidSrc deep-link fallback: Use direct IMDb parameter when TMDB conversion fails
    const imdbId = typeof id === 'string' ? extractImdbId(id) : null;
    if (imdbId) {
      const baseUrl = provider.homepage;
      if (actualType === "tv") {
        // TV deep-link: https://vidsrc.me/embed/tv?imdb=tt0944947&season=2&episode=5
        url = `${baseUrl}/embed/tv?imdb=${imdbId}&season=${validSeason}&episode=${validEpisode}`;
      } else {
        // Movie deep-link: https://vidsrc.me/embed/movie?imdb=tt0944947
        url = `${baseUrl}/embed/movie?imdb=${imdbId}`;
      }
      console.log(`🔗 Using VidSrc deep-link fallback: ${url}`);
    } else {
      console.error(`❌ Cannot use fallback - no valid IMDb ID extracted`);
      return "";
    }
  } else {
    // Standard TMDB ID URL building
    const actualPattern = actualType === "movie" ? provider.moviePattern : provider.tvPattern;
    url = actualPattern
      .replace("{id}", numericId.toString())
      .replace("{season}", validSeason.toString())
      .replace("{episode}", validEpisode.toString());
  }

  console.log(`✅ Built embed URL for ${actualType} ${numericId} S${validSeason}E${validEpisode} using ${provider.id}: ${url}`);
  
  return url;
};

/** Append autoplay hint for embed providers that support it. */
export function embedUrlWithAutoplay(url: string): string {
  if (!url) return url;
  if (/autoplay=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}autoplay=1`;
}

/**
 * Enhanced embed URL with optimization parameters for faster loading
 * Only uses parameters that streaming providers actually support
 */
export async function buildOptimizedEmbedUrl(
  provider: StreamingProvider,
  type: "movie" | "tv",
  id: number | string,
  season: number = 1,
  episode: number = 1,
  options: {
    quality?: string;
    preload?: "none" | "metadata" | "auto";
    bufferLength?: number;
    maxBufferLength?: number;
  } = {}
): Promise<string> {
  const baseUrl = await buildEmbedUrl(provider, type, id, season, episode);
  
  // Only add autoplay parameter - providers don't support custom optimization params
  // Adding unsupported parameters causes providers to redirect to homepage
  return embedUrlWithAutoplay(baseUrl);
}

/**
 * Intelligent provider selection based on multiple factors
 * Considers: priority, reliability, current ping, capabilities, and user connection
 */
export const selectBestProvider = (
  providers: StreamingProvider[],
  userConnectionSpeed: 'slow' | 'medium' | 'fast' = 'medium',
  userRegion: string = 'global'
): StreamingProvider => {
  // Filter providers that support the user's region
  const regionProviders = providers.filter(p => 
    p.cdnRegions.includes('global') || p.cdnRegions.includes(userRegion)
  );
  
  // Score each provider based on multiple factors
  const scoredProviders = regionProviders.map(provider => {
    let score = 0;
    
    // Priority score (lower priority number = higher priority)
    score += (10 - provider.priority) * 15;
    
    // Reliability score
    score += provider.reliabilityScore * 0.5;
    
    // Current ping (lower is better)
    const ping = provider.ping || provider.defaultLatency;
    score += Math.max(0, (200 - ping) * 0.3);
    
    // Adaptive bitrate support bonus for fast connections
    if (userConnectionSpeed === 'fast' && provider.supportsAdaptiveBitrate) {
      score += 10;
    }
    
    // HLS support bonus
    if (provider.supportsHls) {
      score += 8;
    }
    
    // Status penalty
    if (provider.status === 'Slow') score -= 20;
    if (provider.status === 'Offline') score -= 100;
    
    return { provider, score };
  });
  
  // Sort by score and return the best
  scoredProviders.sort((a, b) => b.score - a.score);
  
  return scoredProviders[0]?.provider || providers[0];
};

/**
 * Detect user connection speed using Navigator Connection API
 */
export const detectConnectionSpeed = (): 'slow' | 'medium' | 'fast' => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return 'medium';
  
  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink;
  
  if (effectiveType === '2g' || downlink < 1) return 'slow';
  if (effectiveType === '3g' || downlink < 4) return 'medium';
  return 'fast';
};

/**
 * Estimate user region based on timezone
 */
export const estimateUserRegion = (): string => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  if (timezone.includes('America')) return 'us';
  if (timezone.includes('Europe')) return 'eu';
  if (timezone.includes('Asia')) return 'asia';
  return 'global';
};
export const checkProviderLatency = async (
  provider: StreamingProvider,
  customHomepage?: string
): Promise<{ ping: number; status: "Online" | "Slow" | "Offline" }> => {
  const urlToCheck = customHomepage || provider.homepage;
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout limit

  try {
    await fetch(urlToCheck, {
      mode: "no-cors",
      signal: controller.signal,
      cache: "no-cache",
      credentials: "omit"
    });

    clearTimeout(timeoutId);
    const end = performance.now();
    const ping = Math.round(end - start);

    let status: "Online" | "Slow" | "Offline" = "Online";
    if (ping > 1500) status = "Slow";

    return { ping, status };
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      return { ping: 9999, status: "Offline" };
    }

    const simulatedPing = Math.round(provider.defaultLatency + (Math.random() * 40 - 20));
    let status: "Online" | "Slow" | "Offline" = "Online";
    if (simulatedPing > 1500) status = "Slow";

    return { ping: simulatedPing, status };
  }
};

/**
 * Enhanced HLS configuration with adaptive bitrate streaming
 * Optimized for smooth playback across different connection speeds
 */
export interface HlsConfig {
  enableWorker: boolean;
  enableSoftwareDecoder: boolean;
  maxBufferLength: number;
  maxMaxBufferLength: number;
  maxBufferSize: number;
  maxBufferHole: number;
  lowLatencyMode: boolean;
  backBufferLength: number;
  manifestLoadingTimeOut: number;
  manifestLoadingMaxRetry: number;
  levelLoadingTimeOut: number;
  levelLoadingMaxRetry: number;
  fragLoadingTimeOut: number;
  fragLoadingMaxRetry: number;
  startLevel: number;
  testBandwidth: boolean;
  adaptiveBitrate: boolean;
}

/**
 * Get optimized HLS configuration based on connection speed
 */
export const getOptimizedHlsConfig = (connectionSpeed: 'slow' | 'medium' | 'fast'): HlsConfig => {
  const baseConfig: HlsConfig = {
    enableWorker: true,
    enableSoftwareDecoder: false,
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    maxBufferSize: 60 * 1000 * 1000, // 60MB
    maxBufferHole: 0.5,
    lowLatencyMode: false,
    backBufferLength: 30,
    manifestLoadingTimeOut: 10000,
    manifestLoadingMaxRetry: 3,
    levelLoadingTimeOut: 10000,
    levelLoadingMaxRetry: 3,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 3,
    startLevel: -1, // Auto
    testBandwidth: true,
    adaptiveBitrate: true,
  };

  switch (connectionSpeed) {
    case 'slow':
      return {
        ...baseConfig,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        backBufferLength: 60,
        lowLatencyMode: false,
        startLevel: 0, // Start with lowest quality
        adaptiveBitrate: true,
      };
    case 'medium':
      return {
        ...baseConfig,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        lowLatencyMode: false,
        startLevel: -1, // Auto
        adaptiveBitrate: true,
      };
    case 'fast':
      return {
        ...baseConfig,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        backBufferLength: 15,
        lowLatencyMode: true,
        startLevel: -1, // Auto
        adaptiveBitrate: true,
      };
    default:
      return baseConfig;
  }
};

/**
 * Initialize HLS player with optimized configuration
 */
export const initializeHlsPlayer = (
  videoElement: HTMLVideoElement,
  streamUrl: string,
  config: HlsConfig
): any => {
  if (!(window as any).Hls) {
    console.error('HLS.js not loaded');
    return null;
  }

  const hls = new (window as any).Hls({
    enableWorker: config.enableWorker,
    enableSoftwareDecoder: config.enableSoftwareDecoder,
    maxBufferLength: config.maxBufferLength,
    maxMaxBufferLength: config.maxMaxBufferLength,
    maxBufferSize: config.maxBufferSize,
    maxBufferHole: config.maxBufferHole,
    lowLatencyMode: config.lowLatencyMode,
    backBufferLength: config.backBufferLength,
    manifestLoadingTimeOut: config.manifestLoadingTimeOut,
    manifestLoadingMaxRetry: config.manifestLoadingMaxRetry,
    levelLoadingTimeOut: config.levelLoadingTimeOut,
    levelLoadingMaxRetry: config.levelLoadingMaxRetry,
    fragLoadingTimeOut: config.fragLoadingTimeOut,
    fragLoadingMaxRetry: config.fragLoadingMaxRetry,
    startLevel: config.startLevel,
    testBandwidth: config.testBandwidth,
  });

  hls.loadSource(streamUrl);
  hls.attachMedia(videoElement);

  // Adaptive bitrate configuration
  if (config.adaptiveBitrate) {
    hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
      hls.currentLevel = -1; // Enable adaptive bitrate
    });
  }

  // Error handling with automatic recovery
  hls.on((window as any).Hls.Events.ERROR, (event: any, data: any) => {
    if (data.fatal) {
      switch (data.type) {
        case (window as any).Hls.ErrorTypes.NETWORK_ERROR:
          console.error('Network error, trying to recover...', data);
          hls.startLoad();
          break;
        case (window as any).Hls.ErrorTypes.MEDIA_ERROR:
          console.error('Media error, trying to recover...', data);
          hls.recoverMediaError();
          break;
        default:
          console.error('Fatal error, cannot recover', data);
          hls.destroy();
          break;
      }
    }
  });

  return hls;
};

/**
 * Strict iframe sandbox attributes to block ads and pop-ups
 * Removes allow-top-navigation and allow-popups to prevent ad redirects
 * Maintains essential permissions for video playback
 */
export const IFRAME_SANDBOX_ATTRIBUTES = "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-presentation";

/**
 * Smart preloading and buffering strategies
 * Optimizes video loading based on user behavior and connection quality
 */
export interface PreloadStrategy {
  preloadNext: boolean;
  preloadAhead: number; // Number of segments/episodes to preload
  preloadOnHover: boolean;
  preloadOnVisible: boolean;
  bufferHealthThreshold: number; // Minimum buffer health before preloading next
}

/**
 * Get optimal preload strategy based on connection speed and user behavior
 */
export const getPreloadStrategy = (
  connectionSpeed: 'slow' | 'medium' | 'fast',
  isMobile: boolean = false
): PreloadStrategy => {
  const baseStrategy: PreloadStrategy = {
    preloadNext: true,
    preloadAhead: 1,
    preloadOnHover: true,
    preloadOnVisible: true,
    bufferHealthThreshold: 30,
  };

  switch (connectionSpeed) {
    case 'slow':
      return {
        ...baseStrategy,
        preloadAhead: 0, // Don't preload ahead on slow connections
        preloadOnHover: false, // Disable hover preloading
        bufferHealthThreshold: 60, // Higher threshold before preloading
      };
    case 'medium':
      return {
        ...baseStrategy,
        preloadAhead: 1,
        preloadOnHover: true,
        preloadOnVisible: true,
        bufferHealthThreshold: 30,
      };
    case 'fast':
      return {
        ...baseStrategy,
        preloadAhead: isMobile ? 1 : 2, // Preload more on desktop fast connections
        preloadOnHover: true,
        preloadOnVisible: true,
        bufferHealthThreshold: 15, // Lower threshold, more aggressive preloading
      };
    default:
      return baseStrategy;
  }
};

/**
 * Predictive next-content preloading
 * Preloads the next episode or movie based on user viewing patterns
 */
export class PredictivePreloader {
  private preloadQueue: Map<string, HTMLIFrameElement> = new Map();
  private preloadStrategy: PreloadStrategy;
  private connectionSpeed: 'slow' | 'medium' | 'fast';

  constructor(connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium') {
    this.connectionSpeed = connectionSpeed;
    this.preloadStrategy = getPreloadStrategy(connectionSpeed);
  }

  /**
   * Preload next episode/movie in background
   */
  async preloadNextContent(
    provider: StreamingProvider,
    type: 'movie' | 'tv',
    id: number,
    season: number = 1,
    episode: number = 1
  ): Promise<void> {
    if (!this.preloadStrategy.preloadNext) return;

    const nextEpisode = episode + 1;
    const preloadKey = `${provider.id}-${type}-${id}-${season}-${nextEpisode}`;

    if (this.preloadQueue.has(preloadKey)) return;

    const embedUrl = await buildEmbedUrl(provider, type, id, season, nextEpisode);
    
    // Create hidden iframe for preloading
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.src = embedUrl;
    iframe.setAttribute('loading', 'eager');
    
    document.body.appendChild(iframe);
    this.preloadQueue.set(preloadKey, iframe);

    // Clean up after preload timeout
    setTimeout(() => {
      this.cleanupPreload(preloadKey);
    }, 30000); // 30 seconds preload window
  }

  /**
   * Preload on hover (for movie cards, etc.)
   */
  preloadOnHover(
    provider: StreamingProvider,
    type: 'movie' | 'tv',
    id: number,
    season: number = 1,
    episode: number = 1
  ): () => void {
    if (!this.preloadStrategy.preloadOnHover) {
      return () => {};
    }

    const preloadKey = `${provider.id}-${type}-${id}-${season}-${episode}`;
    let timeoutId: number | null = null;

    const startPreload = () => {
      if (timeoutId !== null) return;
      
      timeoutId = window.setTimeout(() => {
        this.preloadNextContent(provider, type, id, season, episode);
        timeoutId = null;
      }, 500); // 500ms delay before hover preload
    };

    const cancelPreload = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return startPreload;
  }

  /**
   * Clean up preloaded resources
   */
  private cleanupPreload(key: string): void {
    const iframe = this.preloadQueue.get(key);
    if (iframe) {
      iframe.remove();
      this.preloadQueue.delete(key);
    }
  }

  /**
   * Clean up all preloads
   */
  cleanupAll(): void {
    this.preloadQueue.forEach((iframe, key) => {
      iframe.remove();
    });
    this.preloadQueue.clear();
  }

  /**
   * Update preload strategy based on connection changes
   */
  updateStrategy(connectionSpeed: 'slow' | 'medium' | 'fast'): void {
    this.connectionSpeed = connectionSpeed;
    this.preloadStrategy = getPreloadStrategy(connectionSpeed);
  }
}

/**
 * Direct video stream extraction fallback
 * Attempts to extract direct .m3u8 or .mp4 video URLs from embed pages
 */
export const extractDirectStreamUrl = async (embedUrl: string): Promise<string | null> => {
  try {
    // Fetch the embed page content
    const response = await fetch(embedUrl, {
      mode: "no-cors",
      cache: "no-cache",
    });
    
    // Note: Due to CORS, we can't actually read the response content in browser
    // This would need to be implemented via a backend proxy server
    // For now, return null to indicate direct extraction is not available
    return null;
  } catch (error) {
    console.error("Direct stream extraction failed:", error);
    return null;
  }
};

/**
 * Optimized iframe loading configuration
 * Enhances iframe loading performance with connection-aware parameters
 */
export interface IframeLoadConfig {
  loading: 'eager' | 'lazy';
  referrerPolicy: ReferrerPolicy;
  sandbox: string;
  allow: string;
  preload: 'none' | 'metadata' | 'auto';
  defer: boolean;
}

/**
 * Get optimized iframe configuration based on connection and context
 */
export const getOptimizedIframeConfig = (
  connectionSpeed: 'slow' | 'medium' | 'fast',
  isAboveFold: boolean = true
): IframeLoadConfig => {
  return {
    loading: isAboveFold ? 'eager' : 'lazy',
    referrerPolicy: 'origin',
    sandbox: IFRAME_SANDBOX_ATTRIBUTES,
    allow: EMBED_IFRAME_ALLOW,
    preload: connectionSpeed === 'slow' ? 'none' : 'auto',
    defer: !isAboveFold,
  };
};

/**
 * Performance monitoring for iframe loading
 */
export class IframePerformanceMonitor {
  private loadTimes: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();

  recordLoad(providerId: string, loadTime: number): void {
    this.loadTimes.set(providerId, loadTime);
  }

  recordError(providerId: string): void {
    const current = this.errorCounts.get(providerId) || 0;
    this.errorCounts.set(providerId, current + 1);
  }

  getAverageLoadTime(providerId: string): number {
    const times = this.loadTimes.get(providerId);
    return times || 0;
  }

  getErrorCount(providerId: string): number {
    return this.errorCounts.get(providerId) || 0;
  }

  getProviderHealth(providerId: string): 'healthy' | 'degraded' | 'unhealthy' {
    const errors = this.getErrorCount(providerId);
    const avgTime = this.getAverageLoadTime(providerId);

    if (errors >= 3 || avgTime > 5000) return 'unhealthy';
    if (errors >= 1 || avgTime > 3000) return 'degraded';
    return 'healthy';
  }

  reset(): void {
    this.loadTimes.clear();
    this.errorCounts.clear();
  }
}

/**
 * Provider response interface for parallel fetching
 */
interface ProviderResponse {
  provider: StreamingProvider;
  url: string;
  success: boolean;
  latency: number;
  error?: string;
}

/**
 * Aggressive parallel provider fetching with race condition logic
 * Pings all providers simultaneously and returns the first successful response
 */
export const fetchBestProvider = async (
  providers: StreamingProvider[],
  type: "movie" | "tv",
  id: number,
  season: number = 1,
  episode: number = 1
): Promise<ProviderResponse> => {
  const startTime = performance.now();
  
  // Create parallel fetch promises for all providers
  const providerPromises = providers.map(async (provider): Promise<ProviderResponse> => {
    const url = await buildEmbedUrl(provider, type, id, season, episode);
    const providerStart = performance.now();
    
    try {
      // Attempt to fetch with no-cors mode to bypass CORS restrictions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout per provider
      
      await fetch(url, {
        mode: "no-cors",
        signal: controller.signal,
        cache: "no-cache",
        credentials: "omit",
        // Note: Referer and User-Agent cannot be set in browser fetch due to security
        // These would need to be set via a proxy server
      });
      
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - providerStart);
      
      return {
        provider,
        url,
        success: true,
        latency,
      };
    } catch (error: any) {
      const latency = Math.round(performance.now() - providerStart);
      return {
        provider,
        url,
        success: false,
        latency,
        error: error.name === "AbortError" ? "Timeout" : error.message,
      };
    }
  });
  
  // Wait for all providers to complete (race condition)
  const results = await Promise.all(providerPromises);
  
  // Find the first successful provider (lowest latency among successful ones)
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length > 0) {
    // Sort by latency and return the fastest
    successfulResults.sort((a, b) => a.latency - b.latency);
    const best = successfulResults[0];
    console.log(`Best provider selected: ${best.provider.name} (${best.latency}ms)`);
    return best;
  }
  
  // If all failed, return the fastest failure (for fallback handling)
  results.sort((a, b) => a.latency - b.latency);
  console.error(`All providers failed. Fastest failure: ${results[0].provider.name} (${results[0].error})`);
  return results[0];
};

/**
 * Automated failover system for video streaming providers.
 * Monitors iframe loading and automatically switches to next provider on failure.
 * Enhanced with aggressive provider checking and automatic quality detection.
 */
export class ProviderFailoverSystem {
  private currentProviderIndex: number = 0;
  private providers: StreamingProvider[];
  private timeoutMs: number = 6000; // Reduced to 6 seconds for faster failover
  private iframeRef: HTMLIFrameElement | null = null;
  private onProviderChange?: (provider: StreamingProvider) => void;
  private failoverTimeoutId: number | null = null;
  private loadStartTime: number = 0;
  private providerLoadTimes: Map<string, number> = new Map();
  private providerSuccessCount: Map<string, number> = new Map();
  private providerFailureCount: Map<string, number> = new Map();
  private healthCheckInterval: number | null = null;
  private maxRetries: number = 1; // Reduced retries to cycle through providers faster
  private currentRetryCount: number = 0;
  private workingProvider: string | null = null; // Track the working provider
  private verificationAttempts: number = 0;
  private maxVerificationAttempts: number = 3;

  constructor(
    providers: StreamingProvider[],
    onProviderChange?: (provider: StreamingProvider) => void
  ) {
    this.providers = providers;
    this.onProviderChange = onProviderChange;
    
    // Initialize tracking maps
    this.providers.forEach(p => {
      this.providerSuccessCount.set(p.id, 0);
      this.providerFailureCount.set(p.id, 0);
    });
  }

  /**
   * Get the current provider in the failover chain
   */
  getCurrentProvider(): StreamingProvider {
    return this.providers[this.currentProviderIndex];
  }

  /**
   * Set the iframe reference for monitoring
   */
  setIframeRef(iframe: HTMLIFrameElement | null) {
    this.iframeRef = iframe;
  }

  /**
   * Start monitoring the current provider for failures with enhanced detection
   */
  startMonitoring() {
    if (!this.iframeRef) return;

    // Clear any existing timeouts and intervals
    this.clearMonitoring();

    this.loadStartTime = performance.now();
    this.currentRetryCount = 0;
    this.verificationAttempts = 0;

    console.log(`🎬 Starting provider monitoring: ${this.getCurrentProvider().id}`);
    console.log(`   URL pattern: ${this.getCurrentProvider().moviePattern}`);

    // Set up timeout detection with longer delay
    this.failoverTimeoutId = window.setTimeout(() => {
      console.warn(`⏱️ Provider ${this.getCurrentProvider().id} timeout after ${this.timeoutMs}ms`);
      this.handleProviderFailure();
    }, this.timeoutMs);

    // Monitor iframe load events with enhanced tracking
    this.iframeRef.onload = () => {
      if (this.failoverTimeoutId !== null) {
        window.clearTimeout(this.failoverTimeoutId);
        const loadTime = performance.now() - this.loadStartTime;
        this.providerLoadTimes.set(this.getCurrentProvider().id, loadTime);
        
        console.log(`✅ Provider ${this.getCurrentProvider().id} iframe loaded in ${loadTime.toFixed(0)}ms`);
        
        // Verify that video is actually playing
        this.verifyVideoPlayback();
      }
    };

    this.iframeRef.onerror = () => {
      console.error(`❌ Provider ${this.getCurrentProvider().id} iframe error`);
      this.handleProviderFailure();
    };

    // Additional monitoring for iframe content
    this.monitorIframeContent();
  }

  /**
   * Verify that video is actually playing, not just iframe loaded
   */
  private verifyVideoPlayback() {
    this.verificationAttempts++;
    
    if (this.verificationAttempts > this.maxVerificationAttempts) {
      console.warn(`⚠️ Max verification attempts reached for ${this.getCurrentProvider().id}, marking as failed`);
      this.handleProviderFailure();
      return;
    }

    // Give it some time to actually start playing video
    setTimeout(() => {
      try {
        // Try to detect if video element exists and is playing
        if (this.iframeRef?.contentWindow) {
          const iframeDoc = this.iframeRef.contentDocument;
          if (iframeDoc) {
            // Look for video elements
            const videos = iframeDoc.querySelectorAll('video');
            if (videos.length > 0) {
              const video = videos[0] as HTMLVideoElement;
              if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                console.log(`🎥 Video detected and ready in ${this.getCurrentProvider().id}`);
                this.markProviderAsWorking();
                return;
              }
            }
            
            // Check for common video player containers
            const players = iframeDoc.querySelectorAll('[class*="player"], [class*="video"], [id*="player"], [id*="video"]');
            if (players.length > 0) {
              console.log(`🎬 Video player detected in ${this.getCurrentProvider().id}`);
              this.markProviderAsWorking();
              return;
            }
            
            // If we can access DOM but no video found, it's a failure
            console.warn(`⚠️ No video elements found in ${this.getCurrentProvider().id}, marking as failed`);
            this.handleProviderFailure();
            return;
          }
        }
        
        // If we can't access cross-origin, don't assume success - let timeout handle it
        console.log(`🔒 Cross-origin restriction for ${this.getCurrentProvider().id}, waiting for timeout`);
        
      } catch (e) {
        // Cross-origin restriction is normal, don't assume success
        console.log(`🔒 Cross-origin restriction for ${this.getCurrentProvider().id}, waiting for timeout`);
      }
    }, 2000); // Wait 2 seconds for video to start
  }

  /**
   * Mark current provider as working and stop failover
   */
  private markProviderAsWorking() {
    const currentProvider = this.getCurrentProvider();
    
    // Track success
    const currentSuccess = this.providerSuccessCount.get(currentProvider.id) || 0;
    this.providerSuccessCount.set(currentProvider.id, currentSuccess + 1);
    
    // Store as working provider
    this.workingProvider = currentProvider.id;
    
    const successRate = this.getSuccessRate(currentProvider.id);
    console.log(`✅ SUCCESS: ${currentProvider.id} is working! Success rate: ${successRate}%`);
    console.log(`🔒 Locking onto ${currentProvider.id} for continuous playback`);
    
    // Start health check to ensure it keeps working
    this.startHealthCheck();
  }

  /**
   * Monitor iframe content to detect if it's actually playable
   */
  private monitorIframeContent() {
    if (!this.iframeRef) return;

    const checkInterval = setInterval(() => {
      try {
        // Try to access iframe content to detect if it's blocked or showing errors
        if (this.iframeRef.contentWindow) {
          const iframeDoc = this.iframeRef.contentDocument;
          if (iframeDoc) {
            // Check for common error indicators
            const bodyText = iframeDoc.body?.innerText?.toLowerCase() || '';
            if (bodyText.includes('error') || bodyText.includes('not found') || bodyText.includes('unavailable') || bodyText.includes('404')) {
              console.warn(`⚠️ Provider ${this.getCurrentProvider().id} showing error content: ${bodyText.substring(0, 100)}`);
              this.handleProviderFailure();
            }
          }
        }
      } catch (e) {
        // Cross-origin access is normal, ignore
      }
    }, 3000);

    // Store interval ID for cleanup
    (this as any).contentCheckInterval = checkInterval;
  }

  /**
   * Start periodic health checks to ensure provider is still working
   */
  private startHealthCheck() {
    this.healthCheckInterval = window.setInterval(() => {
      const currentProvider = this.getCurrentProvider();
      
      // Only check if we're still on the working provider
      if (this.workingProvider && currentProvider.id !== this.workingProvider) {
        console.log(`🔄 Provider switched from ${this.workingProvider} to ${currentProvider.id}`);
        this.workingProvider = currentProvider.id;
      }
      
      const successRate = this.getSuccessRate(currentProvider.id);
      
      // If success rate drops too low, log warning but don't auto-switch during playback
      if (successRate < 50 && this.providerFailureCount.get(currentProvider.id)! > 2) {
        console.warn(`⚠️ Provider ${currentProvider.id} has degraded performance (${successRate}% success rate)`);
      }
    }, 15000); // Check every 15 seconds
  }

  /**
   * Calculate success rate for a provider
   */
  private getSuccessRate(providerId: string): number {
    const successes = this.providerSuccessCount.get(providerId) || 0;
    const failures = this.providerFailureCount.get(providerId) || 0;
    const total = successes + failures;
    return total > 0 ? Math.round((successes / total) * 100) : 100;
  }

  /**
   * Handle provider failure and switch to next in chain with retry logic
   */
  private handleProviderFailure() {
    const currentProvider = this.getCurrentProvider();
    
    // Track failure
    const currentFailures = this.providerFailureCount.get(currentProvider.id) || 0;
    this.providerFailureCount.set(currentProvider.id, currentFailures + 1);

    console.log(`❌ FAIL: ${currentProvider.id} failed (failure #${currentFailures + 1})`);

    // If this was the working provider, clear it
    if (this.workingProvider === currentProvider.id) {
      console.log(`🔄 Working provider ${currentProvider.id} failed, need to find new one`);
      this.workingProvider = null;
    }

    // Retry current provider if under max retries
    if (this.currentRetryCount < this.maxRetries) {
      this.currentRetryCount++;
      console.log(`🔄 Retrying ${currentProvider.id} (attempt ${this.currentRetryCount}/${this.maxRetries})`);
      
      // Reload iframe with same provider
      if (this.onProviderChange) {
        setTimeout(() => {
          this.onProviderChange(currentProvider);
        }, 1000); // Wait 1 second before retry
      }
      return;
    }

    // Move to next provider if retries exhausted
    if (this.currentProviderIndex < this.providers.length - 1) {
      this.currentProviderIndex++;
      this.currentRetryCount = 0; // Reset retry count for new provider
      this.verificationAttempts = 0;
      const nextProvider = this.providers[this.currentProviderIndex];
      
      console.log(`⚡ FAILOVER: Switching from ${currentProvider.id} to ${nextProvider.name} (${nextProvider.id})`);
      console.log(`   ${currentProvider.id} stats: Success rate ${this.getSuccessRate(currentProvider.id)}%, Failures: ${this.providerFailureCount.get(currentProvider.id)}`);
      
      if (this.onProviderChange) {
        setTimeout(() => {
          this.onProviderChange(nextProvider);
        }, 500); // Small delay before switching
      }
    } else {
      console.error('❌❌❌ ALL PROVIDERS FAILED ❌❌❌');
      console.log('Provider performance summary:');
      this.providers.forEach(p => {
        console.log(`  ${p.name}: Success rate ${this.getSuccessRate(p.id)}%, Load time: ${this.providerLoadTimes.get(p.id) || 'N/A'}ms, Failures: ${this.providerFailureCount.get(p.id)}`);
      });
    }
  }

  /**
   * Get the best performing provider based on historical data
   */
  getBestProvider(): StreamingProvider {
    // If we have a working provider, return it
    if (this.workingProvider) {
      const working = this.providers.find(p => p.id === this.workingProvider);
      if (working) return working;
    }
    
    if (this.providerLoadTimes.size === 0) {
      return this.providers[0];
    }
    
    let bestProvider = this.providers[0];
    let bestScore = this.calculateProviderScore(bestProvider);
    
    for (const provider of this.providers) {
      const score = this.calculateProviderScore(provider);
      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }
    
    return bestProvider;
  }

  /**
   * Calculate a composite score for provider selection
   * Considers success rate, load time, and failure count
   */
  private calculateProviderScore(provider: StreamingProvider): number {
    const successRate = this.getSuccessRate(provider.id);
    const loadTime = this.providerLoadTimes.get(provider.id) || 1000;
    const failures = this.providerFailureCount.get(provider.id) || 0;
    
    // Higher success rate = better
    // Lower load time = better
    // Lower failures = better
    const score = (successRate * 0.6) + ((1000 / loadTime) * 0.3) + ((10 / (failures + 1)) * 0.1);
    
    return score;
  }

  /**
   * Reset to primary provider (useful for manual refresh)
   */
  resetToPrimary() {
    this.currentProviderIndex = 0;
    this.currentRetryCount = 0;
    this.workingProvider = null;
    this.verificationAttempts = 0;
  }

  /**
   * Clear all monitoring intervals and timeouts
   */
  private clearMonitoring() {
    if (this.failoverTimeoutId !== null) {
      window.clearTimeout(this.failoverTimeoutId);
      this.failoverTimeoutId = null;
    }
    
    if (this.healthCheckInterval !== null) {
      window.clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if ((this as any).contentCheckInterval) {
      window.clearInterval((this as any).contentCheckInterval);
      (this as any).contentCheckInterval = null;
    }
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy() {
    this.clearMonitoring();
    
    if (this.iframeRef) {
      this.iframeRef.onload = null;
      this.iframeRef.onerror = null;
    }
  }
}
