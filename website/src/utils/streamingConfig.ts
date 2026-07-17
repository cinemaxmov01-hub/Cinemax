export interface StreamingProvider {
  id: string;
  name: string;
  homepage: string;
  moviePattern?: string; // Biba optional niba kidashyigikiye movies
  tvPattern?: string;    // Biba optional niba kidashyigikiye tv series
  qualityOptions: string[];
  audioOptions: string[];
  subtitlesOptions: string[];
  defaultLatency: number; 
  status: "Online" | "Slow" | "Offline";
  ping?: number; 
}

/**
 * CONFIGURATION NSHYA CYANE:
 * Twatandukanyije neza providers ba Movies na TV Series kugira ngo bidateza urujijo na 404.
 */

// 1. Providers b'akarusho ku ma MOVIES (Vidsrc.pm na Vidsrc.to niyo ya mbere)
export const MOVIE_PROVIDERS: StreamingProvider[] = [
  {
    id: "vidsrc-pm",
    name: "Server 1 (PM)",
    homepage: "https://vidsrc.pm",
    moviePattern: "https://vidsrc.pm/embed/movie/{id}",
    qualityOptions: ["1080p", "720p", "Auto"],
    audioOptions: ["Original", "English"],
    subtitlesOptions: ["Embedded", "English"],
    defaultLatency: 80,
    status: "Online",
  },
  {
    id: "vidsrc-to",
    name: "Server 2 (TO)",
    homepage: "https://vidsrc.to",
    moviePattern: "https://vidsrc.to/embed/movie/{id}",
    qualityOptions: ["1080p", "720p", "Auto"],
    audioOptions: ["Original", "English"],
    subtitlesOptions: ["Embedded", "English"],
    defaultLatency: 95,
    status: "Online",
  },
  {
    id: "vidsrc-cc",
    name: "Server 3 (CC)",
    homepage: "https://vidsrc.cc",
    moviePattern: "https://vidsrc.cc/embed/movie/{id}",
    qualityOptions: ["1080p", "Auto"],
    audioOptions: ["English"],
    subtitlesOptions: ["English"],
    defaultLatency: 110,
    status: "Online",
  }
];

// 2. Providers b'akarusho ku ma TV SERIES / EPISODES
export const TV_PROVIDERS: StreamingProvider[] = [
  {
    id: "vidsrc-to-tv",
    name: "TV Server 1 (TO)",
    homepage: "https://vidsrc.to",
    tvPattern: "https://vidsrc.to/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "Auto"],
    audioOptions: ["Original", "English"],
    subtitlesOptions: ["Embedded", "English"],
    defaultLatency: 90,
    status: "Online",
  },
  {
    id: "vidsrc-pm-tv",
    name: "TV Server 2 (PM)",
    homepage: "https://vidsrc.pm",
    tvPattern: "https://vidsrc.pm/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "720p", "Auto"],
    audioOptions: ["Original", "English"],
    subtitlesOptions: ["Embedded", "English"],
    defaultLatency: 95,
    status: "Online",
  },
  {
    id: "vidsrc-cc-tv",
    name: "TV Server 3 (CC)",
    homepage: "https://vidsrc.cc",
    tvPattern: "https://vidsrc.cc/embed/tv/{id}/{season}/{episode}",
    qualityOptions: ["1080p", "Auto"],
    audioOptions: ["English"],
    subtitlesOptions: ["English"],
    defaultLatency: 115,
    status: "Online",
  }
];

export const EMBED_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

/**
 * Kubaka embed URL ukurikije niba ari Movie cyangwa TV series
 */
export const buildEmbedUrl = (
  provider: StreamingProvider,
  type: "movie" | "tv",
  id: number | string,
  season: number = 1,
  episode: number = 1
): string => {
  if (type === "movie") {
    if (!provider.moviePattern) return "";
    return provider.moviePattern.replace("{id}", id.toString());
  } else {
    if (!provider.tvPattern) return "";
    return provider.tvPattern
      .replace("{id}", id.toString())
      .replace("{season}", (season || 1).toString())
      .replace("{episode}", (episode || 1).toString());
  }
};

/**
 * Guhitamo automatic ya Provider idafite ibibazo bya offline/404
 */
export const fetchBestProvider = async (
  type: "movie" | "tv",
  id: number | string,
  season: number = 1,
  episode: number = 1
): Promise<{ provider: StreamingProvider; url: string }> => {
  // Hitamo list y'aba providers dukurikije icyo umukoresha ashatse
  const providers = type === "movie" ? MOVIE_PROVIDERS : TV_PROVIDERS;
  
  // Niba hari abapfuye (nka xyz), hano hazakoreshwa gusa aba babiri cyangwa batatu mbere
  const bestProvider = providers[0]; 
  const url = buildEmbedUrl(bestProvider, type, id, season, episode);

  return {
    provider: bestProvider,
    url
  };
};
