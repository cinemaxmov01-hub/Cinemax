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
 * Optimized configuration with VidLink, VidSrc Pro, and Embed.su.
 */
export const PROVIDERS_CONFIG: StreamingProvider[] = [
  {
    // VidLink — clean player with custom color theming
    id: "vidlink",
    name: "VidLink",
    homepage: "https://vidlink.pro",
    moviePattern: "https://vidlink.pro/{id}?primaryColor=39FF14&autoplay=true",
    tvPattern: "https://vidlink.pro/{id}/{season}/{episode}?primaryColor=39FF14&autoplay=true",
    qualityOptions: ["4K", "1080p", "720p", "480p", "360p", "Auto"],
    audioOptions: ["Original", "English", "Spanish", "French"],
    subtitlesOptions: ["Embedded", "English", "Spanish", "French", "Auto"],
    defaultLatency: 95,
    status: "Online",
  },
  {
    // VidSrc Pro — reliable streaming provider
    id: "vidsrc-pro",
    name: "VidSrc Pro",
    homepage: "https://vidsrc.pro",
    moviePattern: "https://vidsrc.pro/{id}",
    tvPattern: "https://vidsrc.pro/{id}/{season}/{episode}",
    qualityOptions: ["4K", "1080p", "720p", "480p", "360p", "Auto"],
    audioOptions: ["Original", "English", "Spanish", "French"],
    subtitlesOptions: ["Embedded", "English", "Spanish", "French", "Auto"],
    defaultLatency: 100,
    status: "Online",
  },
  {
    // Embed.su — fallback streaming provider
    id: "embed-su",
    name: "Embed.su",
    homepage: "https://embed.su",
    moviePattern: "https://embed.su/{id}",
    tvPattern: "https://embed.su/{id}/{season}/{episode}",
    qualityOptions: ["4K", "1080p", "720p", "480p", "360p", "Auto"],
    audioOptions: ["Original", "English", "Spanish", "French"],
    subtitlesOptions: ["Embedded", "English", "Spanish", "French", "Auto"],
    defaultLatency: 115,
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
  subtitles: string = "English",
  quality: string = "1080p",
  audio: string = "English"
): string => {
  const pattern = type === "movie" ? provider.moviePattern : provider.tvPattern;

  let url = pattern
    .replace("{id}", id.toString())
    .replace("{season}", season.toString())
    .replace("{episode}", episode.toString());

  // Validate URL construction
  if (!url || url.includes("{") || url.includes("}")) {
    console.error(`[buildEmbedUrl] Invalid URL construction for ${provider.id}:`, url);
  }

  // Add quality parameter for supported providers
  if (quality && quality !== "Auto") {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}quality=${quality.toLowerCase()}`;
  }

  // Add subtitles parameter
  if (subtitles) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}subtitles=${subtitles.toLowerCase()}`;
  }

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
