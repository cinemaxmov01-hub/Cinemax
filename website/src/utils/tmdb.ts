import { Movie, CastMember, Review } from "../types";

const BASE_URL = "https://api.themoviedb.org/3";
const FALLBACK_API_KEY = "422828f653928ec5244f1a63a8b8641f";

/** True when a catalog item should play as a TV series (season/episode embed). */
export function isTvShow(item: Pick<Movie, "title" | "name" | "media_type">): boolean {
  if (item.media_type === "tv") return true;
  if (item.media_type === "movie") return false;
  return !item.title && !!item.name;
}

function normalizeSearchItem(raw: Movie & { media_type?: string }, fallbackType: "movie" | "tv"): Movie | null {
  // Validate ID exists and is valid
  if (!raw.id || raw.id <= 0) {
    console.warn(`⚠️ Invalid TMDB ID in search result: ${raw.id}`);
    return null;
  }
  
  if (!raw.poster_path || (!raw.title && !raw.name)) return null;
  const mt = raw.media_type as string | undefined;
  if (mt === "person") return null;
  
  // Enhanced media_type detection with multiple fallback strategies
  let media_type: "movie" | "tv";
  
  if (mt === "tv") {
    media_type = "tv";
  } else if (mt === "movie") {
    media_type = "movie";
  } else if (!raw.title && raw.name) {
    // If it has a name but no title, it's likely a TV show
    media_type = "tv";
  } else if (raw.title && !raw.name) {
    // If it has a title but no name, it's likely a movie
    media_type = "movie";
  } else if (raw.first_air_date && !raw.release_date) {
    // Has first_air_date but no release_date -> TV show
    media_type = "tv";
  } else if (raw.release_date && !raw.first_air_date) {
    // Has release_date but no first_air_date -> movie
    media_type = "movie";
  } else {
    // Final fallback to the provided fallback type
    media_type = fallbackType;
  }
  
  return { ...raw, media_type };
}

function searchResultKey(item: Movie): string {
  return `${item.media_type || (item.title ? "movie" : "tv")}:${item.id}`;
}

function scoreSearchResult(item: Movie, query: string): number {
  const q = query.toLowerCase().trim();
  const title = (item.title || item.name || "").toLowerCase();
  let score = (item.vote_average || 0) * 2;
  score += Math.log10((item.vote_count || 50) + 1) * 8;
  score += (item.popularity || 0) * 0.05;
  
  // Strongly prioritize content with high vote counts (more likely to be available on streaming)
  if ((item.vote_count || 0) < 50) score -= 100;
  if ((item.vote_count || 0) < 20) score -= 200;
  
  // Penalize very old content that might not be on streaming
  const releaseDate = item.release_date || item.first_air_date;
  if (releaseDate) {
    const year = parseInt(releaseDate.split('-')[0]);
    if (year && year < 1950) score -= 50;
    if (year && year < 2000) score -= 20;
  }
  
  // Boost score for very popular content (more likely to be on streaming providers)
  if ((item.popularity || 0) > 100) score += 30;
  if ((item.popularity || 0) > 500) score += 50;
  
  if (title === q) score += 200;
  else if (title.startsWith(q)) score += 80;
  else if (title.includes(q)) score += 40;
  const qWords = q.split(/\s+/).filter(Boolean);
  if (qWords.length > 1 && qWords.every((w) => title.includes(w))) score += 30;
  return score;
}

export interface SearchBatchResult {
  results: Movie[];
  totalPages: number;
  hasMore: boolean;
}

/** Fetches full TMDB details and resolves the correct movie vs TV type for streaming embeds. */
export async function prepareForPlayback(item: Movie): Promise<Movie> {
  console.log(`prepareForPlayback called with: id=${item.id}, media_type=${item.media_type}, title=${item.title || item.name}, isCustom=${item.isCustom}`);
  
  // For custom content with TMDB ID, use the TMDB ID for playback
  if (item.isCustom && item.tmdb_id) {
    console.log(`Custom content with TMDB ID: ${item.tmdb_id}, using that for playback`);
    const itemWithTmdbId = { ...item, id: item.tmdb_id };
    return prepareForPlayback(itemWithTmdbId);
  }
  
  if (item.isCustom || item.id <= 0) {
    console.log(`Item is custom or invalid ID, returning as-is`);
    return { ...item, media_type: item.media_type ?? "movie" };
  }

  // If media_type is already set and valid, use it directly
  if (item.media_type === "movie" || item.media_type === "tv") {
    console.log(`Using provided media_type: ${item.media_type}`);
    try {
      const endpoint = item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
      console.log(`Fetching from TMDB endpoint: ${endpoint}`);
      const details = await fetchFromTMDB<Movie>(endpoint);
      console.log(`TMDB response for ${item.media_type}: id=${details.id}, title=${details.title || details.name}`);
      
      const result = {
        ...item,
        ...details,
        media_type: item.media_type,
        poster_path: details.poster_path || item.poster_path,
        backdrop_path: details.backdrop_path || item.backdrop_path,
      };
      
      console.log(`Prepared for playback: id=${result.id}, media_type=${result.media_type}`);
      return result;
    } catch (err) {
      console.log(`Failed to fetch ${item.media_type} details for id ${item.id}:`, err);
      // Fall through to try other media types
    }
  }

  const preferTv = isTvShow(item);
  const tryOrder: Array<"movie" | "tv"> = preferTv ? ["tv", "movie"] : ["movie", "tv"];

  console.log(`Trying media types in order: ${tryOrder.join(", ")}`);

  for (const type of tryOrder) {
    try {
      const endpoint = type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
      console.log(`Fetching from TMDB endpoint: ${endpoint}`);
      const details = await fetchFromTMDB<Movie>(endpoint);
      console.log(`TMDB response for ${type}: id=${details.id}, title=${details.title || details.name}`);
      
      const result = {
        ...item,
        ...details,
        media_type: type,
        poster_path: details.poster_path || item.poster_path,
        backdrop_path: details.backdrop_path || item.backdrop_path,
      };
      
      console.log(`Prepared for playback: id=${result.id}, media_type=${result.media_type}`);
      return result;
    } catch (err) {
      console.log(`Failed to fetch ${type} details for id ${item.id}:`, err);
      /* try the other media type — search results can mislabel titles */
    }
  }

  // If both endpoints fail, try a multi-search to get the correct media_type
  console.log(`Both endpoints failed, trying multi-search to determine correct media_type`);
  try {
    const multiData = await fetchFromTMDB<{ results: Array<Movie & { media_type?: string }> }>(
      "/search/multi",
      { query: item.title || item.name || "", page: "1" }
    );
    
    const matchedItem = multiData.results.find((r) => r.id === item.id);
    if (matchedItem && matchedItem.media_type) {
      console.log(`Found correct media_type from multi-search: ${matchedItem.media_type}`);
      // Fetch full details with the correct media_type
      const endpoint = matchedItem.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
      const details = await fetchFromTMDB<Movie>(endpoint);
      
      return {
        ...item,
        ...details,
        media_type: matchedItem.media_type,
        poster_path: details.poster_path || item.poster_path,
        backdrop_path: details.backdrop_path || item.backdrop_path,
      };
    }
  } catch (err) {
    console.log(`Multi-search also failed:`, err);
  }

  console.log(`All attempts failed, returning item with inferred media_type`);
  return {
    ...item,
    media_type: item.media_type ?? (preferTv ? "tv" : "movie"),
  };
}

let runtimeApiKey = FALLBACK_API_KEY;

export function setTmdbApiKey(key: string) {
  if (key && key.trim()) runtimeApiKey = key.trim();
}

export function getTmdbApiKey() {
  return runtimeApiKey;
}

export async function initTmdbFromSiteConfig() {
  try {
    const res = await fetch("/api/config/public");
    if (!res.ok) return;
    const data = await res.json();
    if (data.tmdbApiKey) setTmdbApiKey(data.tmdbApiKey);
  } catch {
    /* use fallback key */
  }
}

export const getImageUrl = (path: string | null, size: "w500" | "w780" | "original" = "w500") => {
  if (!path) return "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500&auto=format&fit=crop";
  // Custom/CMS content stores full image URLs rather than TMDB path
  // fragments — pass those through untouched instead of double-prefixing.
  if (/^https?:\/\//i.test(path)) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

async function fetchFromTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    api_key: getTmdbApiKey(),
    ...params,
  });
  
  const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API Error: ${response.statusText}`);
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Error fetching from endpoint ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Check if an ID is in IMDb format (tt followed by numbers)
 */
export function isImdbId(id: string | number): boolean {
  if (typeof id === 'number') return false;
  return /^tt\d{7,8}$/.test(id);
}

/**
 * Auto-clean protocol: Extract pure IMDb ID from messy URLs
 * Handles various IMDb URL formats:
 * - https://imdb.com/title/tt0944947
 * - https://www.imdb.com/title/tt0944947/
 * - https://imdb.com/title/tt0944947/ref=...
 * - tt0944947 (already clean)
 */
export function extractImdbId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  // If already in clean format, return as-is
  if (/^tt\d{7,8}$/.test(input.trim())) {
    return input.trim();
  }
  
  // Try to extract from URL patterns
  const patterns = [
    /imdb\.com\/title\/(tt\d{7,8})/i,
    /imdb\.com\/name\/(tt\d{7,8})/i,
    /(tt\d{7,8})/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      console.log(`🧹 Auto-cleaned IMDb ID: ${input} -> ${match[1]}`);
      return match[1];
    }
  }
  
  console.warn(`⚠️ Could not extract valid IMDb ID from: ${input}`);
  return null;
}

/**
 * Convert IMDb ID to TMDB ID using TMDB's /find endpoint
 * Returns the TMDB ID and media type (movie or tv)
 */
export async function convertImdbToTmdb(imdbId: string): Promise<{ tmdbId: number; mediaType: "movie" | "tv"; title: string } | null> {
  try {
    console.log(`🔄 Converting IMDb ID ${imdbId} to TMDB ID using /find endpoint`);
    
    const data = await fetchFromTMDB<{
      movie_results: Array<{ id: number; title: string; release_date?: string }>;
      tv_results: Array<{ id: number; name: string; first_air_date?: string }>;
    }>(`/find/${imdbId}`, { external_source: "imdb_id" });
    
    // Check for TV results first (since user mentioned TV shows specifically)
    if (data.tv_results && data.tv_results.length > 0) {
      const tvResult = data.tv_results[0];
      console.log(`✅ Found TV show: ${tvResult.name} (TMDB ID: ${tvResult.id})`);
      return { tmdbId: tvResult.id, mediaType: "tv", title: tvResult.name };
    }
    
    // Check for movie results
    if (data.movie_results && data.movie_results.length > 0) {
      const movieResult = data.movie_results[0];
      console.log(`✅ Found movie: ${movieResult.title} (TMDB ID: ${movieResult.id})`);
      return { tmdbId: movieResult.id, mediaType: "movie", title: movieResult.title };
    }
    
    console.warn(`⚠️ No results found for IMDb ID: ${imdbId}`);
    return null;
  } catch (error) {
    console.error(`❌ Error converting IMDb ID ${imdbId}:`, error);
    return null;
  }
}

/**
 * Double ID Verification: Verify TMDB ID is real and get title
 * This ensures the ID exists before serving to provider engine
 */
export async function verifyTmdbId(tmdbId: number, mediaType: "movie" | "tv"): Promise<{ valid: boolean; title?: string } | null> {
  try {
    console.log(`🔍 Verifying TMDB ID ${tmdbId} (${mediaType})`);
    
    const endpoint = mediaType === "tv" ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const data = await fetchFromTMDB<{ id: number; title?: string; name?: string }>(endpoint);
    
    if (data && data.id === tmdbId) {
      const title = data.title || data.name;
      console.log(`✅ Verified TMDB ID ${tmdbId}: ${title}`);
      return { valid: true, title };
    }
    
    console.warn(`⚠️ TMDB ID ${tmdbId} verification failed`);
    return { valid: false };
  } catch (error) {
    console.error(`❌ Error verifying TMDB ID ${tmdbId}:`, error);
    return { valid: false };
  }
}

export const tmdb = {
  // Movies - Focused on brand new content only with high availability
  getTrendingMovies: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/trending/movie/week", { page: String(page) });
    // Filter to only include recent releases (last 6 months) with high engagement
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return data.results.filter((m) => 
      m.poster_path && 
      m.release_date && 
      m.release_date >= sixMonthsAgo &&
      (m.vote_count || 0) >= 50 && // Minimum votes for availability
      (m.popularity || 0) >= 10 // Minimum popularity
    );
  },
  getPopularMovies: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      page: String(page),
      "release_date.lte": new Date().toISOString().split('T')[0],
      "release_date.gte": new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sort_by: "popularity.desc",
      "vote_count.gte": "100" // Increased threshold for better availability
    });
    return data.results.filter((m) => 
      m.poster_path && 
      (m.vote_count || 0) >= 50 &&
      (m.popularity || 0) >= 20
    );
  },
  getTopRatedMovies: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      page: String(page),
      "release_date.lte": new Date().toISOString().split('T')[0],
      "release_date.gte": new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sort_by: "vote_average.desc",
      "vote_count.gte": "100", // Increased threshold
      "vote_average.gte": "7.0"
    });
    return data.results.filter((m) => 
      m.poster_path && 
      (m.vote_count || 0) >= 50 &&
      (m.popularity || 0) >= 15
    );
  },
  getUpcomingMovies: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/movie/upcoming", { page: String(page) });
    return data.results.filter((m) => m.poster_path);
  },
  getNowPlayingMovies: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/movie/now_playing", { page: String(page) });
    return data.results.filter((m) => m.poster_path);
  },
  // Get latest releases (most recent movies - last 90 days)
  getLatestMovies: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      page: String(page),
      "release_date.lte": new Date().toISOString().split('T')[0],
      "release_date.gte": new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sort_by: "release_date.desc",
      "vote_count.gte": "10"
    });
    return data.results.filter((m) => m.poster_path);
  },
  // Get movies by specific year (current year and recent years)
  getMoviesByYear: async (year: number, page = 1) => {
    const currentYear = new Date().getFullYear();
    // Only allow current year and recent years (last 3 years)
    if (year < currentYear - 3) {
      console.warn(`Year ${year} is too old, returning empty results for brand new content focus`);
      return [];
    }
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      page: String(page),
      "primary_release_year": String(year),
      sort_by: "popularity.desc",
      "vote_count.gte": "10"
    });
    return data.results.filter((m) => m.poster_path);
  },
  // Get latest TV series (airing in current year)
  getLatestTVSeries: async (page = 1) => {
    const currentYear = new Date().getFullYear();
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/tv", {
      page: String(page),
      "first_air_date.lte": new Date().toISOString().split('T')[0],
      "first_air_date.gte": `${currentYear}-01-01`,
      sort_by: "popularity.desc",
      "vote_count.gte": "10"
    });
    return data.results.filter((m) => m.poster_path);
  },
  // Get highly rated new releases (last 6 months)
  getTopRatedNewReleases: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      page: String(page),
      "release_date.lte": new Date().toISOString().split('T')[0],
      "release_date.gte": new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sort_by: "vote_average.desc",
      "vote_count.gte": "50",
      "vote_average.gte": "7.0"
    });
    return data.results.filter((m) => m.poster_path);
  },
  getMovieDetails: async (id: number) => {
    return await fetchFromTMDB<Movie>(`/movie/${id}`);
  },
  getMovieVideos: async (id: number) => {
    const data = await fetchFromTMDB<{ results: Array<{ key: string; name: string; type: string; site: string }> }>(
      `/movie/${id}/videos`
    );
    // Find YouTube trailer
    return data.results.filter(video => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser"));
  },
  getMovieCredits: async (id: number) => {
    const data = await fetchFromTMDB<{ cast: CastMember[] }>(`/movie/${id}/credits`);
    return data.cast.slice(0, 25);
  },
  getMovieReviews: async (id: number) => {
    const data = await fetchFromTMDB<{ results: Review[] }>(`/movie/${id}/reviews`);
    return data.results.slice(0, 5);
  },
  getSimilarMovies: async (id: number) => {
    const data = await fetchFromTMDB<{ results: Movie[] }>(`/movie/${id}/similar`);
    return data.results.slice(0, 10);
  },
  getMovieRecommendations: async (id: number) => {
    const data = await fetchFromTMDB<{ results: Movie[] }>(`/movie/${id}/recommendations`);
    return data.results.slice(0, 10);
  },

  // Generic paginated discover — powers infinite scroll for a single genre (brand new content only)
  discoverMoviesByGenre: async (genreId: number, page = 1, sortBy: string = "popularity.desc") => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      with_genres: String(genreId),
      sort_by: sortBy,
      page: String(page),
      "release_date.lte": new Date().toISOString().split('T')[0],
      "release_date.gte": new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "vote_count.gte": "20",
    });
    return { results: data.results.filter((m) => m.poster_path), totalPages: data.total_pages };
  },
  // Combine several TMDB genre ids into one curated discover query (used to
  // build the more specific "Gens" mature/romance sub-categories, e.g.
  // Romance + Comedy for "Romantic Comedies").
  discoverMoviesByGenres: async (genreIds: number[], page = 1, sortBy: string = "popularity.desc") => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      with_genres: genreIds.join(","),
      sort_by: sortBy,
      page: String(page),
      "release_date.lte": new Date().toISOString().split('T')[0],
      "release_date.gte": new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "vote_count.gte": "20",
    });
    return { results: data.results.filter((m) => m.poster_path), totalPages: data.total_pages };
  },
  discoverTVByGenre: async (genreId: number, page = 1, sortBy: string = "popularity.desc") => {
    const currentYear = new Date().getFullYear();
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/tv", {
      with_genres: String(genreId),
      sort_by: sortBy,
      page: String(page),
      "first_air_date.lte": new Date().toISOString().split('T')[0],
      "first_air_date.gte": `${currentYear}-01-01`,
      "vote_count.gte": "20",
    });
    return { results: data.results.filter((m) => m.poster_path), totalPages: data.total_pages };
  },

  // TV Shows - Focused on brand new content only with high availability
  getTrendingTVShows: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/trending/tv/week", { page: String(page) });
    // Filter to only include recent TV shows (last 6 months) with high engagement
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return data.results.filter((m) => 
      m.poster_path && 
      m.first_air_date && 
      m.first_air_date >= sixMonthsAgo &&
      (m.vote_count || 0) >= 50 && // Minimum votes for availability
      (m.popularity || 0) >= 10 // Minimum popularity
    );
  },
  getPopularTVShows: async (page = 1) => {
    const currentYear = new Date().getFullYear();
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/tv", {
      page: String(page),
      "first_air_date.lte": new Date().toISOString().split('T')[0],
      "first_air_date.gte": `${currentYear}-01-01`,
      sort_by: "popularity.desc",
      "vote_count.gte": "100" // Increased threshold for better availability
    });
    return data.results.filter((m) => 
      m.poster_path && 
      (m.vote_count || 0) >= 50 &&
      (m.popularity || 0) >= 20
    );
  },
  getTopRatedTVShows: async (page = 1) => {
    const currentYear = new Date().getFullYear();
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/discover/tv", {
      page: String(page),
      "first_air_date.lte": new Date().toISOString().split('T')[0],
      "first_air_date.gte": `${currentYear}-01-01`,
      sort_by: "vote_average.desc",
      "vote_count.gte": "100", // Increased threshold
      "vote_average.gte": "7.0"
    });
    return data.results.filter((m) => 
      m.poster_path && 
      (m.vote_count || 0) >= 50 &&
      (m.popularity || 0) >= 15
    );
  },
  getAiringTodayTVShows: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/tv/airing_today", { page: String(page) });
    return data.results.filter((m) => m.poster_path);
  },
  getOnTheAirTVShows: async (page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/tv/on_the_air", { page: String(page) });
    return data.results.filter((m) => m.poster_path);
  },
  getTVDetails: async (id: number) => {
    return await fetchFromTMDB<Movie>(`/tv/${id}`);
  },
  getTVSeason: async (id: number, season: number) => {
    const data = await fetchFromTMDB<{
      episodes: Array<{ episode_number: number; name: string; still_path: string | null; air_date: string }>;
      season_number: number;
    }>(`/tv/${id}/season/${season}`);
    return data.episodes || [];
  },
  searchMovies: async (query: string, page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[] }>("/search/movie", { query, page: String(page) });
    return data.results.filter((m) => m.poster_path);
  },
  searchTV: async (query: string, page = 1) => {
    const data = await fetchFromTMDB<{ results: Movie[] }>("/search/tv", { query, page: String(page) });
    return data.results.filter((m) => m.poster_path);
  },
  getTVVideos: async (id: number) => {
    const data = await fetchFromTMDB<{ results: Array<{ key: string; name: string; type: string; site: string }> }>(
      `/tv/${id}/videos`
    );
    return data.results.filter(video => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser"));
  },
  getTVCredits: async (id: number) => {
    const data = await fetchFromTMDB<{ cast: CastMember[] }>(`/tv/${id}/credits`);
    return data.cast.slice(0, 25);
  },
  getTVReviews: async (id: number) => {
    const data = await fetchFromTMDB<{ results: Review[] }>(`/tv/${id}/reviews`);
    return data.results.slice(0, 5);
  },
  getTVRecommendations: async (id: number) => {
    const data = await fetchFromTMDB<{ results: Movie[] }>(`/tv/${id}/recommendations`);
    return data.results.slice(0, 10);
  },

  // Search & Genres — unified engine across movies, TV, and multi index
  searchMulti: async (query: string, page = 1) => {
    const data = await fetchFromTMDB<{ results: Array<Movie & { media_type?: string }>; total_pages: number }>(
      "/search/multi",
      { query, page: String(page), include_adult: "false" }
    );
    return data.results
      .map((item) => normalizeSearchItem(item, item.media_type === "tv" ? "tv" : "movie"))
      .filter((item): item is Movie => item !== null);
  },

  /**
   * Deep search: queries movie, TV, and multi endpoints in parallel for each
   * page in the batch, merges/dedupes, and ranks by title match + popularity.
   */
  searchEverything: async (
    query: string,
    options: { startPage?: number; pageCount?: number } = {}
  ): Promise<SearchBatchResult> => {
    const startPage = options.startPage ?? 1;
    const pageCount = options.pageCount ?? 3;
    const pages = Array.from({ length: pageCount }, (_, i) => startPage + i);

    const empty = { results: [] as Movie[], total_pages: 0 };
    const requests = pages.flatMap((page) => [
      fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/search/movie", {
        query,
        page: String(page),
        include_adult: "false",
      }).catch(() => empty),
      fetchFromTMDB<{ results: Movie[]; total_pages: number }>("/search/tv", {
        query,
        page: String(page),
        include_adult: "false",
      }).catch(() => empty),
      fetchFromTMDB<{ results: Array<Movie & { media_type?: string }>; total_pages: number }>(
        "/search/multi",
        { query, page: String(page), include_adult: "false" }
      ).catch(() => empty),
    ]);

    const batches = await Promise.all(requests);
    const seen = new Set<string>();
    const merged: Movie[] = [];

    batches.forEach((batch, idx) => {
      const endpointKind = idx % 3;
      const fallback: "movie" | "tv" = endpointKind === 1 ? "tv" : "movie";
      for (const raw of batch.results || []) {
        const item = normalizeSearchItem(raw as Movie & { media_type?: string }, fallback);
        if (!item) continue;
        // Movie/TV list endpoints never set media_type — force it from endpoint kind
        if (endpointKind === 0) item.media_type = "movie";
        if (endpointKind === 1) item.media_type = "tv";
        const key = searchResultKey(item);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    });

    merged.sort((a, b) => scoreSearchResult(b, query) - scoreSearchResult(a, query));

    const maxTotalPages = Math.max(...batches.map((b) => b.total_pages || 0), 0);
    const lastPageFetched = startPage + pageCount - 1;

    return {
      results: merged,
      totalPages: maxTotalPages,
      hasMore: lastPageFetched < maxTotalPages,
    };
  },

  /** Match Cinemax Originals / custom CMS titles against a query string. */
  searchCustomContent: async (query: string): Promise<Movie[]> => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    try {
      const res = await fetch("/api/content/custom");
      if (!res.ok) return [];
      const { movies } = await res.json();
      return (movies || []).filter((m: Movie) => {
        const title = (m.title || m.name || "").toLowerCase();
        const overview = (m.overview || "").toLowerCase();
        return title.includes(q) || overview.includes(q);
      });
    } catch {
      return [];
    }
  },

  getGenres: async (type: "movie" | "tv" = "movie") => {
    const data = await fetchFromTMDB<{ genres: Array<{ id: number; name: string }> }>(`/genre/${type}/list`);
    return data.genres;
  },

  // Visual Search support: resolve human-readable genre names (from the AI vision
  // analysis) to TMDB genre IDs, then discover movies matching those genres,
  // sorted by popularity so results are recognizable and well-posterized.
  discoverByGenreNames: async (genreNames: string[]) => {
    if (!genreNames || genreNames.length === 0) return [];
    const allGenres = await fetchFromTMDB<{ genres: Array<{ id: number; name: string }> }>("/genre/movie/list");
    const matchedIds = allGenres.genres
      .filter((g) => genreNames.some((name) => g.name.toLowerCase() === name.toLowerCase()))
      .map((g) => g.id);
    if (matchedIds.length === 0) return [];
    const data = await fetchFromTMDB<{ results: Movie[] }>("/discover/movie", {
      with_genres: matchedIds.join(","),
      sort_by: "popularity.desc",
    });
    return data.results.filter((m) => m.poster_path);
  },

  // Runs multi-search across a batch of visual keywords and merges/dedupes results.
  searchByKeywords: async (keywords: string[]) => {
    if (!keywords || keywords.length === 0) return [];
    const batches = await Promise.all(
      keywords.slice(0, 4).map((kw) =>
        fetchFromTMDB<{ results: Movie[] }>("/search/movie", { query: kw }).catch(() => ({ results: [] as Movie[] }))
      )
    );
    const seen = new Set<number>();
    const merged: Movie[] = [];
    for (const batch of batches) {
      for (const m of batch.results) {
        if (m.poster_path && !seen.has(m.id)) {
          seen.add(m.id);
          merged.push(m);
        }
      }
    }
    return merged;
  },
};
