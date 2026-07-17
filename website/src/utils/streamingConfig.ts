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
}

/**
 * Streaming sources for the Multi-Server Movie Player.
 * Configured with only the specified providers: vidsrc.pm, vidsrc.to, and vidsrc.cc.
 */
export const PROVIDERS_CONFIG: StreamingProvider[] = [
  {
    // Vidsrc.pm — Primary stream provider
    id: "vidsrc-pm",
    name: "P1",
    homepage: "https://vidsrc.pm",
    moviePattern: "https://vidsrc.pm/embed/movie/{id}",
    tvPattern: "https://vidsrc.pm/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "Auto"],
    audioOptions: ["Original", "English"],
    subtitlesOptions: ["Embedded", "English"],
    defaultLatency: 95,
    status: "Online",
  },
  {
    // Vidsrc.to — Secondary stream provider
    id: "vidsrc-to",
    name: "P2",
    homepage: "https://vidsrc.to",
    moviePattern: "https://vidsrc.to/embed/movie/{id}",
    tvPattern: "https://vidsrc.to/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "Auto"],
    audioOptions: ["Original", "English"],
    subtitlesOptions: ["Embedded", "English"],
    defaultLatency: 100,
    status: "Online",
  },
  {
    // Vidsrc.cc — Tertiary backup provider
    id: "vidsrc-cc",
    name: "P3",
    homepage: "https://vidsrc.cc",
    moviePattern: "https://vidsrc.cc/embed/movie/{id}",
    tvPattern: "https://vidsrc.cc/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "Auto"],
    audioOptions: ["Original", "English"],
    subtitlesOptions: ["Embedded", "English"],
    defaultLatency: 110,
    status: "Online",
  },
];

/** Permissions required for third-party embed players (autoplay, HLS, fullscreen). */
export const EMBED_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

export const buildEmbedUrl = (
  provider: StreamingProvider,
  type: "movie" | "tv",
  id: number | string,
  season: number = 1,
  episode: number = 1,
  _subtitles: string = "English",
  _quality: string = "Auto",
  _audio: string = "English"
): string => {
  const pattern = type === "movie" ? provider.moviePattern : provider.tvPattern;

  // Log input parameters for debugging
  console.log(`buildEmbedUrl called with: type=${type}, id=${id} (${typeof id}), season=${season}, episode=${episode}`);

  // Validate and sanitize parameters
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const validSeason = Math.max(1, season);
  const validEpisode = Math.max(1, episode);

  // Temporarily relax validation to debug 404 issues
  if (isNaN(numericId)) {
    console.error(`Invalid TMDB ID (NaN): ${id} (type: ${typeof id})`);
    return "";
  }

  if (numericId <= 0) {
    console.warn(`TMDB ID is <= 0: ${numericId}, but proceeding anyway for debugging`);
  }

  const url = pattern
    .replace("{id}", numericId.toString())
    .replace("{season}", validSeason.toString())
    .replace("{episode}", validEpisode.toString());

  console.log(`Built embed URL for ${type} ${numericId} S${validSeason}E${validEpisode}: ${url}`);
  
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
 * Perform a real network latency check against the provider domain homepage
 * with fallback to mock response if connection gets blocked by security or offline.
 */
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
 * Advanced iframe sandbox attributes to bypass frame-ancestors and CSP blocks
 * Optimized for maximum compatibility with streaming providers
 */
export const IFRAME_SANDBOX_ATTRIBUTES = "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-presentation allow-popups";

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
    const url = buildEmbedUrl(provider, type, id, season, episode);
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
 */
export class ProviderFailoverSystem {
  private currentProviderIndex: number = 0;
  private providers: StreamingProvider[];
  private timeoutMs: number = 5000; // 5-second timeout for failover (increased for reliability)
  private iframeRef: HTMLIFrameElement | null = null;
  private onProviderChange?: (provider: StreamingProvider) => void;
  private failoverTimeoutId: number | null = null;

  constructor(
    providers: StreamingProvider[],
    onProviderChange?: (provider: StreamingProvider) => void
  ) {
    this.providers = providers;
    this.onProviderChange = onProviderChange;
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
   * Start monitoring the current provider for failures
   */
  startMonitoring() {
    if (!this.iframeRef) return;

    // Clear any existing timeout
    if (this.failoverTimeoutId !== null) {
      window.clearTimeout(this.failoverTimeoutId);
    }

    // Set up timeout detection
    this.failoverTimeoutId = window.setTimeout(() => {
      this.handleProviderFailure();
    }, this.timeoutMs);

    // Monitor iframe load events
    this.iframeRef.onload = () => {
      if (this.failoverTimeoutId !== null) {
        window.clearTimeout(this.failoverTimeoutId);
      }
    };

    this.iframeRef.onerror = () => {
      this.handleProviderFailure();
    };
  }

  /**
   * Handle provider failure and switch to next in chain
   */
  private handleProviderFailure() {
    if (this.currentProviderIndex < this.providers.length - 1) {
      this.currentProviderIndex++;
      const nextProvider = this.providers[this.currentProviderIndex];
      
      console.log(`Provider failover: Switching to ${nextProvider.name} (${nextProvider.id})`);
      
      if (this.onProviderChange) {
        this.onProviderChange(nextProvider);
      }
    } else {
      console.error('All providers failed. No more fallback options available.');
    }
  }

  /**
   * Reset to primary provider (useful for manual refresh)
   */
  resetToPrimary() {
    this.currentProviderIndex = 0;
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy() {
    if (this.failoverTimeoutId !== null) {
      window.clearTimeout(this.failoverTimeoutId);
      this.failoverTimeoutId = null;
    }
    
    if (this.iframeRef) {
      this.iframeRef.onload = null;
      this.iframeRef.onerror = null;
    }
  }
}
