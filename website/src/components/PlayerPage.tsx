import { useState, useEffect, useRef } from "react";
import { Movie, CastMember, Review } from "../types";
import { useApp } from "../context/AppContext";
import { 
  ArrowLeft, 
  Star, 
  Bookmark, 
  Heart, 
  Download, 
  Share2, 
  Sparkles,
  Info,
  Users,
  BookmarkCheck,
  Check,
  X,
  Tv,
  Film,
  Clock,
  ExternalLink,
  Play,
  ChevronRight,
  MessageSquare
} from "lucide-react";
import { getImageUrl, tmdb, isTvShow } from "../utils/tmdb";
import { AdBanner } from "./AdBanner";
import { fetchPublicAds, PublicAd } from "../utils/siteConfig";
import { MovieCard } from "./MovieCard";
import { 
  PROVIDERS_CONFIG, 
  buildEmbedUrl, 
  embedUrlWithAutoplay, 
  EMBED_IFRAME_ALLOW,
  selectBestProvider,
  detectConnectionSpeed,
  estimateUserRegion,
  buildOptimizedEmbedUrl,
  getOptimizedHlsConfig,
  initializeHlsPlayer,
  getOptimizedIframeConfig,
  PredictivePreloader,
  IframePerformanceMonitor
} from "../utils/streamingConfig";
import { LiveChat } from "./LiveChat";
import { WatchChoiceModal } from "./WatchChoiceModal";
import { DownloadChoiceModal } from "./DownloadChoiceModal";
import { FullMovieDownloadModal } from "./FullMovieDownloadModal";

/**
 * "Up Next" — a tall, auto-sliding recommended queue that lives in the
 * player's right sidebar, directly below Live Chat. A large featured slide
 * up top auto-advances, with the full upcoming queue listed cleanly below it.
 */
const UpNextQueue: React.FC<{ movies: Movie[]; onSelect: (m: Movie) => void }> = ({ movies, onSelect }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (movies.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % movies.length), 3000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (movies.length === 0) return null;
  const current = movies[index];
  const goTo = (i: number) => setIndex(((i % movies.length) + movies.length) % movies.length);

  return (
    <div id="up-next-queue" className="glass-card rounded-3xl overflow-hidden border border-white/5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#0a0a0a]/20">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#39FF14]" />
          <span className="font-sans font-bold text-sm text-white tracking-tight">Up Next</span>
        </div>
        <div className="flex items-center gap-1">
          {movies.slice(0, 8).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-[#39FF14]" : "w-1 bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Featured slide */}
      <div className="relative w-full aspect-[3/2] overflow-hidden group flex-none">
        <button
          onClick={() => onSelect(current)}
          className="absolute inset-0 w-full h-full cursor-pointer block"
          title={`Watch ${current.title || current.name}`}
        >
          <img
            key={current.id}
            src={getImageUrl(current.backdrop_path || current.poster_path, "w500")}
            alt={current.title || current.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-left space-y-1.5">
            <p className="font-sans font-black text-lg text-white leading-snug line-clamp-1 tracking-tight">
              {current.title || current.name}
            </p>
            <div className="flex items-center gap-2.5">
              {current.vote_average != null && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#39FF14] font-bold">
                  <Star className="h-3 w-3 fill-[#39FF14]" />
                  {current.vote_average.toFixed(1)}
                </span>
              )}
              {(current.release_date || current.first_air_date) && (
                <span className="text-[10px] text-neutral-400 font-medium">
                  {(current.release_date || current.first_air_date || "").slice(0, 4)}
                </span>
              )}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-12 w-12 rounded-full bg-[#39FF14] flex items-center justify-center">
              <Play className="h-5 w-5 text-black fill-black ml-0.5" />
            </div>
          </div>
        </button>

        {/* Manual prev/next controls, revealed on hover */}
        {movies.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(index - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[#0a0a0a]/50 backdrop-blur border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[#0a0a0a]/70"
              title="Previous"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(index + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[#0a0a0a]/50 backdrop-blur border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[#0a0a0a]/70"
              title="Next"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Clean vertical queue list — the rest of the upcoming titles, in order */}
      <div className="flex flex-col divide-y divide-white/5 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-900 scrollbar-track-transparent">
        {movies.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setIndex(i)}
            title={m.title || m.name}
            className={`flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer group/item ${
              i === index ? "bg-[#39FF14]/10" : "hover:bg-white/5"
            }`}
          >
            <span className={`w-4 flex-none text-center text-[10px] font-black ${i === index ? "text-[#39FF14]" : "text-neutral-600"}`}>
              {i === index ? <Play className="h-3 w-3 fill-[#39FF14] text-[#39FF14] mx-auto" /> : i + 1}
            </span>
            <div className={`flex-none w-10 aspect-[2/3] rounded-lg overflow-hidden border transition-all ${
              i === index ? "border-[#22c55e]" : "border-white/10 opacity-70 group-hover/item:opacity-100"
            }`}>
              <img src={getImageUrl(m.poster_path, "w500")} alt={m.title || m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold truncate ${i === index ? "text-[#39FF14]" : "text-white"}`}>
                {m.title || m.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {m.vote_average != null && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-neutral-500">
                    <Star className="h-2.5 w-2.5 fill-neutral-500" />
                    {m.vote_average.toFixed(1)}
                  </span>
                )}
                {(m.release_date || m.first_air_date) && (
                  <span className="text-[10px] text-neutral-600">
                    {(m.release_date || m.first_air_date || "").slice(0, 4)}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/** Quick actions beneath Up Next — binge/shuffle controls. */
const UpNextActions: React.FC<{
  movies: Movie[];
  onSelect: (m: Movie) => void;
  onShuffle: () => void;
  isTv?: boolean;
  onBinge?: () => void;
}> = ({ movies, onSelect, onShuffle, isTv, onBinge }) => {
  if (movies.length === 0) return null;
  const featured = movies[0];
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Quick Actions</p>
      <button
        onClick={() => onSelect(featured)}
        className="w-full flex items-center gap-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 px-4 py-3 text-left hover:bg-[#22c55e]/15 transition-colors cursor-pointer"
      >
        <Play className="h-4 w-4 text-[#22c55e] fill-[#22c55e]" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">Play Next: {featured.title || featured.name}</p>
          <p className="text-[10px] text-neutral-500">Jump straight into the next recommendation</p>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onShuffle}
          className="rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-[11px] font-bold text-neutral-300 hover:border-[#22c55e]/30 hover:text-white transition-colors cursor-pointer"
        >
          Shuffle Up Next
        </button>
        {isTv && onBinge && (
          <button
            onClick={onBinge}
            className="rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-[11px] font-bold text-neutral-300 hover:border-[#22c55e]/30 hover:text-white transition-colors cursor-pointer"
          >
            Next Episode
          </button>
        )}
      </div>
    </div>
  );
};

const SidePanelShelf: React.FC<{ title: string; movies: Movie[]; onSelect: (m: Movie) => void }> = ({ title, movies, onSelect }) => {
  if (movies.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {movies.slice(0, 6).map((movie) => (
          <MovieCard key={movie.id} movie={movie} onClick={() => onSelect(movie)} />
        ))}
      </div>
    </section>
  );
};

const SideCastPanel: React.FC<{ cast: CastMember[]; title: string }> = ({ cast, title }) => {
  if (cast.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {cast.slice(0, 8).map((member, idx) => (
          <div key={`${member.id || member.name}-${idx}`} className="min-w-0 p-3 text-center">
            <img
              src={member.profile_path ? getImageUrl(member.profile_path, "w500") : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"}
              alt={member.name}
              className="mx-auto h-24 w-24 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <p className="mt-2 truncate text-[11px] font-bold text-white">{member.name}</p>
            <p className="truncate text-[10px] text-neutral-500">{member.character}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export const PlayerPage: React.FC = () => {
  const { 
    selectedMovie, 
    setSelectedMovie, 
    setPlayerMode,
    playerMode,
    addToHistory,
    user,
    addToFavorites,
    removeFromFavorites,
    likeMovie,
    unlikeMovie,
    addToWatchlist,
    removeFromWatchlist,
    setCurrentView,
    searchQuery,
    downloadMovie,
    downloads,
    downloadStorageUsed,
    downloadStorageLimit,
    isGuest,
    requireSignInPrompt,
    t,
  } = useApp();

  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [playerAds, setPlayerAds] = useState<PublicAd[]>([]);
  const [fullDownloadModalOpen, setFullDownloadModalOpen] = useState(false);
  const [fullDownloadResult, setFullDownloadResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetchPublicAds().then((ads) => setPlayerAds(ads.filter((a) => a.placement === "player_pre_roll")));
  }, []);

  const handleDownload = async (mode: "device" | "cinemax") => {
    if (mode === "cinemax" && (isGuest || !user)) {
      requireSignInPrompt();
      return;
    }
    setDownloadChoiceOpen(false);
    setDownloadMsg(null);
    setDownloadBusy(true);
    const result = await downloadMovie(selectedMovie!, mode);
    setDownloadBusy(false);
    if (result.ok) {
      setDownloadMsg(mode === "device" ? "Device download started." : "Saved to Cinemax Download History.");
    } else {
      setDownloadMsg(result.error || "Download failed.");
    }
    setTimeout(() => setDownloadMsg(null), 3000);
  };

  const handleFullMovieDownload = async () => {
    setFullDownloadResult(null);
    setDownloadBusy(true);
    const result = await downloadMovie(selectedMovie!, "device");
    setDownloadBusy(false);
    setFullDownloadResult(result);
    if (result.ok) {
      setTimeout(() => {
        setFullDownloadModalOpen(false);
        setFullDownloadResult(null);
      }, 1000);
    }
  };

  const openChoiceForMovie = (movie: Movie) => setChoiceMovie(movie);

  const handlePlayerChoice = (choice: "full" | "trailer") => {
    if (!choiceMovie) return;
    setSelectedMovie(choiceMovie);
    setPlayerMode(choice);
    setChoiceMovie(null);
    setIsLoadingVideo(true);
  };

  const isDownloaded = selectedMovie ? downloads.some((d) => d.movie_id === selectedMovie.id) : false;
  const storageFull = downloadStorageUsed >= downloadStorageLimit;

  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [tvDetails, setTvDetails] = useState<any>(null);
  const [seasonsList, setSeasonsList] = useState<number[]>([]);
  const [episodesList, setEpisodesList] = useState<number[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>(PROVIDERS_CONFIG[0].id);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [streamSource, setStreamSource] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<'embed' | 'mp4' | 'hls'>('embed');
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [choiceMovie, setChoiceMovie] = useState<Movie | null>(null);
  const [downloadChoiceOpen, setDownloadChoiceOpen] = useState(false);
  const [downloadClickPosition, setDownloadClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [providerError, setProviderError] = useState(false);
  const [failedProviders, setFailedProviders] = useState<Set<string>>(new Set());

  // Enhanced streaming optimization
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [userRegion, setUserRegion] = useState<string>('global');
  const predictivePreloaderRef = useRef<PredictivePreloader | null>(null);
  const performanceMonitorRef = useRef<IframePerformanceMonitor | null>(null);

  const isTv = selectedMovie ? isTvShow(selectedMovie) : false;
  console.log(`📺 TV Show Detection: isTv=${isTv}, media_type=${selectedMovie?.media_type}, title=${selectedMovie?.title}, name=${selectedMovie?.name}`);
  const isFavorited = user && selectedMovie ? user.favorites.includes(selectedMovie.id) : false;
  const isWatchlisted = user && selectedMovie ? (user.myList || user.watchlist || []).includes(selectedMovie.id) : false;

  // Initialize connection detection and optimization systems
  useEffect(() => {
    setConnectionSpeed(detectConnectionSpeed());
    setUserRegion(estimateUserRegion());
    predictivePreloaderRef.current = new PredictivePreloader(detectConnectionSpeed());
    performanceMonitorRef.current = new IframePerformanceMonitor();

    // Monitor connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        const newSpeed = detectConnectionSpeed();
        setConnectionSpeed(newSpeed);
        if (predictivePreloaderRef.current) {
          predictivePreloaderRef.current.updateStrategy(newSpeed);
        }
      };
      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);

  // Reset episode/season when switching titles with intelligent provider selection
  useEffect(() => {
    if (!selectedMovie) return;
    setCurrentSeason(1);
    setCurrentEpisode(1);
    setTrailerKey(null);
    setIsLoadingVideo(false);
    setProviderError(false);
    setFailedProviders(new Set()); // Reset failed providers for new content
    
    // Use intelligent provider selection instead of hardcoded default
    const bestProvider = selectBestProvider(PROVIDERS_CONFIG, connectionSpeed, userRegion);
    setActiveServerId(bestProvider.id);
    console.log(`🎯 Selected optimal provider: ${bestProvider.name} (Priority: ${bestProvider.priority}, Reliability: ${bestProvider.reliabilityScore}%)`);
  }, [selectedMovie?.id, selectedMovie?.media_type, connectionSpeed, userRegion]);

  // Automatic fallback logic for provider errors with enhanced multi-provider support
  const handleProviderError = () => {
    setProviderError(true);
    
    // Mark current provider as failed
    setFailedProviders(prev => new Set(prev).add(activeServerId));
    
    // Find next available provider that hasn't failed
    const availableProviders = PROVIDERS_CONFIG.filter(p => !failedProviders.has(p.id) && p.id !== activeServerId);
    
    if (availableProviders.length > 0) {
      const nextProvider = availableProviders[0]; // Get first available provider
      console.log(`🔄 Provider ${activeServerId} failed, automatically switching to ${nextProvider.id} (${nextProvider.name})`);
      console.log(`📺 Maintaining current state: Season ${currentSeason}, Episode ${currentEpisode}`);
      setActiveServerId(nextProvider.id);
    } else {
      console.error(`❌ All providers failed for this content. User may need to try different content.`);
      // Reset failed providers to allow retry
      setFailedProviders(new Set());
    }
  };

  // Manual provider switch handler - maintains season/episode state
  const handleProviderSwitch = (providerId: string) => {
    console.log(`🎛️ User manually switched to provider: ${providerId}`);
    console.log(`📺 Maintaining current state: Season ${currentSeason}, Episode ${currentEpisode}`);
    setActiveServerId(providerId);
    setProviderError(false);
    setFailedProviders(prev => {
      const newSet = new Set(prev);
      newSet.delete(providerId); // Remove from failed set on manual switch
      return newSet;
    });
    setIsLoadingVideo(true);
  };

  // Reset error state when provider changes
  useEffect(() => {
    setProviderError(false);
  }, [activeServerId]);

  // Load deep details
  useEffect(() => {
    if (!selectedMovie) return;
    // Custom/CMS content isn't a real TMDB id — nothing here would resolve
    // to anything meaningful, so skip straight past it.
    if (selectedMovie.isCustom) {
      setCast([]);
      setReviews([]);
      setSimilarMovies([]);
      setRecommendations([]);
      setTrailerKey(selectedMovie.trailerYoutubeKey || null);
      return;
    }

    const loadDetails = async () => {
      try {
        const id = selectedMovie.id;
        
        // Fetch Credits (Cast)
        const castData = isTv
          ? await tmdb.getTVCredits(id)
          : await tmdb.getMovieCredits(id);
        setCast(castData);

        // Fetch Reviews
        const reviewData = isTv
          ? await tmdb.getTVReviews(id)
          : await tmdb.getMovieReviews(id);
        setReviews(reviewData);

        // Fetch Similar
        const similarData = isTv
          ? await tmdb.getTVRecommendations(id)
          : await tmdb.getSimilarMovies(id);
        setSimilarMovies(similarData);

        // Fetch Recommendations
        const recData = isTv
          ? await tmdb.getTVRecommendations(id)
          : await tmdb.getMovieRecommendations(id);
        setRecommendations(recData);

        // Fetch trailer key
        try {
          const videos = isTv
            ? await tmdb.getTVVideos(id)
            : await tmdb.getMovieVideos(id);
          if (videos && videos.length > 0) {
            setTrailerKey(videos[0].key);
          } else {
            setTrailerKey(null);
          }
        } catch (vErr) {
          console.error("Error loading trailer key", vErr);
          setTrailerKey(null);
        }

        // If TV, fetch TV seasons details
        if (isTv) {
          const details = await tmdb.getTVDetails(id);
          setTvDetails(details);
          const totalSeasons = details.number_of_seasons || 1;
          const seasons = Array.from({ length: totalSeasons }, (_, i) => i + 1).filter((s) => s >= 1);
          setSeasonsList(seasons.length > 0 ? seasons : [1]);
        }

        // Add to watch history on first load
        addToHistory(
          selectedMovie.id,
          selectedMovie.title || selectedMovie.name || "Untitled",
          selectedMovie.poster_path,
          isTv ? "tv" : "movie",
          selectedMovie.runtime || 124,
          isTv ? currentSeason : undefined,
          isTv ? currentEpisode : undefined
        );

      } catch (err) {
        console.error("Error loading movie player deep details", err);
      }
    };

    loadDetails();
  }, [selectedMovie]);

  // Load real episode numbers for the selected season (fixes 404 on latest episodes)
  useEffect(() => {
    if (!selectedMovie || selectedMovie.isCustom || !isTv) return;

    console.log(`Loading episodes for TV show ${selectedMovie.id}, Season ${currentSeason}`);

    // Immediately reset to episode 1 when season changes to prevent 404 errors
    setCurrentEpisode(1);
    setEpisodesList([]);

    const loadSeasonEpisodes = async () => {
      try {
        console.log(`Fetching TMDB season data for show ${selectedMovie.id}, season ${currentSeason}`);
        const episodes = await tmdb.getTVSeason(selectedMovie.id, currentSeason);
        console.log(`TMDB returned ${episodes.length} episodes for season ${currentSeason}`);
        
        // Filter out any null/invalid episode numbers and sort
        const nums = episodes
          .map((e) => e.episode_number)
          .filter((n) => n != null && !isNaN(n) && n > 0)
          .sort((a, b) => a - b);
        
        console.log(`Valid episode numbers:`, nums);
        
        // Remove duplicates while preserving order
        const uniqueNums = [...new Set(nums)];
        
        // If we have valid episodes from TMDB, use them
        if (uniqueNums.length > 0) {
          setEpisodesList(uniqueNums);
          console.log(`Setting current episode to: ${uniqueNums[0]}`);
          setCurrentEpisode(uniqueNums[0]);
        } else {
          // Fallback: generate episode numbers based on typical season structure
          // Most seasons have 8-24 episodes, so we'll create a reasonable range
          console.warn(`No valid episodes found for season ${currentSeason}, generating fallback episode list`);
          const fallbackEpisodes = Array.from({ length: 12 }, (_, i) => i + 1); // Default to 12 episodes
          setEpisodesList(fallbackEpisodes);
          setCurrentEpisode(1);
        }
      } catch (err) {
        console.error("Error loading season episodes", err);
        // Fallback to a reasonable number of episodes if API fails
        const fallbackEpisodes = Array.from({ length: 12 }, (_, i) => i + 1);
        setEpisodesList(fallbackEpisodes);
        setCurrentEpisode(1);
      }
    };

    loadSeasonEpisodes();
  }, [selectedMovie, currentSeason, isTv]);

  // Generate embed URL when parameters change
  useEffect(() => {
    const generateUrl = async () => {
      if (!selectedMovie) return;
      const url = await getStreamUrl();
      setEmbedUrl(url);
    };
    generateUrl();
  }, [selectedMovie, currentSeason, currentEpisode, playerMode, activeServerId]);

  // Loader effect: show Cinemax loader for 1.5 seconds on mount or video change (No motion animations)
  // Increased time to ensure iframe properly loads new episode content
  useEffect(() => {
    setIsLoadingVideo(true);
    const progressTimer = setTimeout(() => {
      setIsLoadingVideo(false);
    }, 1500);

    return () => clearTimeout(progressTimer);
  }, [selectedMovie, currentSeason, currentEpisode, playerMode, activeServerId]);

  const handleToggleFavorite = () => {
    if (!user) return;
    if (isFavorited) {
      unlikeMovie(selectedMovie.id);
    } else {
      // Liking auto-saves the title to the watchlist too.
      likeMovie(selectedMovie.id);
    }
  };

  const handleToggleWatchlist = () => {
    if (!user) return;
    if (isWatchlisted) {
      removeFromWatchlist(selectedMovie.id);
    } else {
      addToWatchlist(selectedMovie.id);
    }
  };

  const activeServer = PROVIDERS_CONFIG.find(p => p.id === activeServerId) || PROVIDERS_CONFIG[0];
  
  // Debug logging for TV playback
  console.log(`Active server: ${activeServer.id} (${activeServer.name}), isTv: ${isTv}, currentSeason: ${currentSeason}, currentEpisode: ${currentEpisode}`);

  const API_BASE =
    (typeof import.meta === "object" && (import.meta as any).env?.VITE_API_BASE_URL)
      ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/+$/, "")
      : "";

  // Determine stream source based on playerMode with optimized URL building
  const getStreamUrl = async () => {
    if (!selectedMovie) return "";

    console.log(`🎬 getStreamUrl called: isTv=${isTv}, media_type=${selectedMovie.media_type}, title=${selectedMovie.title}, name=${selectedMovie.name}`);

    // For custom content imported from TMDB, use the TMDB ID for streaming
    const effectiveId = selectedMovie.isCustom && selectedMovie.tmdb_id ? selectedMovie.tmdb_id : selectedMovie.id;
    
    // Admin-authored "custom content" without TMDB ID only plays its trailer
    if (selectedMovie.isCustom && !selectedMovie.tmdb_id) {
      return selectedMovie.trailerYoutubeKey
        ? `https://www.youtube.com/embed/${selectedMovie.trailerYoutubeKey}?autoplay=1&rel=0`
        : "";
    }

    // Validate ID before building URL
    if (!effectiveId || effectiveId <= 0) {
      console.error(`❌ Invalid ID: ${effectiveId}`);
      return "";
    }

    const mode = playerMode || "full";

    if (mode === "trailer") {
      return trailerKey
        ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`
        : await buildOptimizedEmbedUrl(activeServer, isTv ? "tv" : "movie", effectiveId, currentSeason, currentEpisode);
    }

    // Use optimized embed URL (only adds autoplay parameter)
    const mediaType = isTv ? "tv" : "movie";
    console.log(`🎯 Building URL for ${mediaType} with ID=${effectiveId}, Season=${currentSeason}, Episode=${currentEpisode}`);
    
    const optimizedUrl = await buildOptimizedEmbedUrl(
      activeServer,
      mediaType,
      effectiveId,
      currentSeason,
      currentEpisode
    );

    console.log(`🚀 Optimized stream URL: ${optimizedUrl}`);
    console.log(`📡 Active server: ${activeServer.name} (${activeServer.id}) - Priority: ${activeServer.priority}, Reliability: ${activeServer.reliabilityScore}%`);
    console.log(`🌐 Connection: ${connectionSpeed}, Region: ${userRegion}`);
    console.log(`🎬 Media type: ${mediaType}`);
    console.log(`🆔 Effective ID: ${effectiveId} (original: ${selectedMovie.id})`);
    console.log(`📺 Season: ${currentSeason}, Episode: ${currentEpisode}`);

    return optimizedUrl;
  };

  // Try to resolve a direct media source (mp4 or m3u8) using the backend resolver.
  useEffect(() => {
    let mounted = true;
    setStreamSource(null);
    setStreamType('embed');
    if (!selectedMovie || selectedMovie.isCustom) return;

    const providersToTry = [activeServer, ...PROVIDERS_CONFIG.filter((p) => p.id !== activeServer.id)];

    const tryResolveProvider = async (provider: typeof activeServer) => {
      const embed = await buildEmbedUrl(provider, isTv ? 'tv' : 'movie', selectedMovie.id, currentSeason, currentEpisode);
      
      try {
        const res = await fetch(`${API_BASE}/api/stream/full`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ url: embed }),
        });
        
        if (!res.ok) {
          console.warn('Stream resolution failed with status:', res.status);
          return null;
        }
        
        const j = await res.json();
        const source = j?.sourceUrl as string | undefined | null;
        
        if (!source) {
          console.log('No direct source found for provider:', provider.id);
          return null;
        }
        
        const proxied = API_BASE ? `${API_BASE}/api/proxy?url=${encodeURIComponent(source)}` : source;
        const isHls = /\.m3u8(?:\?|$)/i.test(source);
        
        console.log('Direct source resolved:', { provider: provider.id, type: isHls ? 'hls' : 'mp4', source: proxied });
        
        return { type: isHls ? 'hls' as const : 'mp4' as const, source: proxied };
      } catch (err) {
        console.warn('Provider resolve failed', provider.id, err);
        return null;
      }
    };

    const tryResolve = async () => {
      for (const provider of providersToTry) {
        if (!mounted) break;
        try {
          console.log(`Attempting to resolve stream using provider: ${provider.id}`);
          const result = await tryResolveProvider(provider);
          if (result && mounted) {
            setStreamType(result.type);
            setStreamSource(result.source);
            console.log('Successfully resolved stream using provider:', provider.id);
            return;
          }
        } catch (err) {
          console.warn('Provider resolve failed', provider.id, err);
        }
      }
      
      // If no direct source was found, fall back to embed
      if (mounted) {
        console.log('No direct source found from any provider, falling back to embed iframe');
        setStreamType('embed');
      }
    };

    tryResolve();

    return () => { mounted = false; };
  }, [selectedMovie?.id, activeServerId, currentSeason, currentEpisode]);

  // Attach HLS with optimized configuration
  useEffect(() => {
    if (!streamSource || streamType !== 'hls' || !videoRef.current) return;
    let hlsInstance: any = null;
    let createdScript = false;

    const attach = () => {
      try {
        if ((window as any).Hls) {
          // Use optimized HLS configuration based on connection speed
          const hlsConfig = getOptimizedHlsConfig(connectionSpeed);
          console.log(`🎬 Using optimized HLS config for ${connectionSpeed} connection:`, hlsConfig);
          
          hlsInstance = initializeHlsPlayer(videoRef.current!, streamSource!, hlsConfig);
          
          if (hlsInstance) {
            (videoRef.current as any).play().catch(() => {});
            console.log('✅ HLS player initialized successfully');
          }
          return hlsInstance;
        }
      } catch (e) {
        console.error('HLS attach error', e);
      }
      return null;
    };

    const tryLoadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).Hls) return resolve();
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js'; // Updated to latest stable
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load hls.js'));
        document.head.appendChild(s);
        createdScript = true;
      });
    };

    (async () => {
      try {
        await tryLoadScript();
        hlsInstance = attach();
      } catch (e) {
        console.error('Unable to initialize HLS playback', e);
      }
    })();

    return () => {
      try {
        if (hlsInstance && typeof hlsInstance.destroy === 'function') {
          hlsInstance.destroy();
          console.log('🧹 HLS instance cleaned up');
        }
        if (createdScript) {
          const scripts = Array.from(document.querySelectorAll('script'));
          const s = scripts.find((el) => (el as HTMLScriptElement).src.includes('hls.js'));
          if (s && s.parentNode) s.parentNode.removeChild(s);
        }
      } catch {}
    };
  }, [streamSource, streamType, connectionSpeed]);

  if (!selectedMovie) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-neutral-500 text-sm animate-fade-in">
        No title selected.
      </div>
    );
  }

  return (
    <div id="player-container" className="min-h-screen bg-transparent text-white flex flex-col lg:flex-row pb-12">
      
      {/* Left Area (Clean stream player, details, recommendations) */}
      <div id="player-main-section" className="flex-1 px-4 py-6 lg:px-8 overflow-x-hidden">
        
        {/* Back Button / Navigation */}
        <div id="player-header-nav" className="flex items-center justify-between mb-6">
          <button 
            id="player-back-btn"
            onClick={() => {
              setPlayerMode(null);
              setSelectedMovie(null);
              if (searchQuery.trim().length <= 1) setCurrentView("home");
            }}
            className="flex items-center gap-2 text-neutral-400 hover:text-[#39FF14] font-sans font-medium transition-colors duration-200 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Discovery</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#39FF14]/10 border border-[#39FF14]/20 px-2.5 py-1 text-xs text-[#39FF14] font-black uppercase tracking-widest">
              {selectedMovie.isCustom ? "Cinemax Original — Trailer" : playerMode === "trailer" ? "Trailer Mode" : "Full Movie Stream"}
            </span>
          </div>
        </div>

        {/* Video Player Canvas */}
        {playerMode === "full" && playerAds.length > 0 && (
          <div className="max-w-5xl space-y-2 mb-4">
            {playerAds.map((ad) => (
              <AdBanner key={ad.id} ad={ad} variant="pre-roll" />
            ))}
          </div>
        )}
        <div 
          id="video-player-container" 
          className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/5 bg-[#0a0a0a] max-w-5xl"
        >
          <iframe
            key={`${activeServerId}-${selectedMovie.id}-${currentSeason}-${currentEpisode}`}
            id="vidsrc-stream-iframe"
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full border-0"
            allow={EMBED_IFRAME_ALLOW}
            allowFullScreen
            referrerPolicy="origin"
            scrolling="no"
            loading={getOptimizedIframeConfig(connectionSpeed, true).loading}
            onError={handleProviderError}
            onLoad={() => {
              if (performanceMonitorRef.current) {
                const loadTime = performance.now() - (window as any).playerLoadStart;
                performanceMonitorRef.current.recordLoad(activeServerId, loadTime);
                console.log(`⏱️ Iframe loaded in ${loadTime.toFixed(0)}ms`);
              }
            }}
          />
        </div>

        {/* Provider Switch Buttons - P1, P2, P3, P4 */}
        <div className="max-w-5xl mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-neutral-500">Server:</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PROVIDERS_CONFIG.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  setActiveServerId(provider.id);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeServerId === provider.id
                    ? "bg-[#39FF14] text-black shadow-[0_0_10px_rgba(57,255,20,0.3)]"
                    : "bg-[#0a0a0a]/40 border border-white/10 text-neutral-400 hover:text-white hover:border-[#39FF14]/25"
                }`}
              >
                {provider.name}
              </button>
            ))}
          </div>
          {/* Hint for TV series */}
          {isTv && (
            <div className="mt-2 text-[10px] text-neutral-400 flex items-center gap-2">
              <span>💡</span>
              <span>Try different servers if episode fails to load.</span>
            </div>
          )}
        </div>

        {/* TV Episode Selector Grid (IF TV SHOW) */}
        {isTv && tvDetails && playerMode !== "trailer" && (
          <div id="tv-episode-selector" className="max-w-5xl mt-6 p-6 rounded-3xl glass-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
              <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2">
                <Tv className="h-5 w-5 text-[#39FF14]" />
                <span>Episodes Selection</span>
              </h3>
              
              {/* Season dropdown selection */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-500">Season:</span>
                <select 
                  value={currentSeason}
                  onChange={(e) => {
                    const newSeason = Number(e.target.value);
                    console.log(`🔄 Season changed to: ${newSeason}, resetting episode to 1`);
                    setIsLoadingVideo(true);
                    setCurrentSeason(newSeason);
                    setCurrentEpisode(1);
                  }}
                  className="bg-[#0a0a0a]/60 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-semibold text-white focus:border-[#39FF14]/50 transition-colors cursor-pointer focus:outline-none"
                >
                  {seasonsList.map(s => (
                    <option key={s} value={s}>Season {s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Episode quick chips — scrollable for full seasons */}
            <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto scrollbar-thin">
              {episodesList.map(ep => {
                const isActive = currentEpisode === ep;
                return (
                  <button
                    key={ep}
                    id={`episode-chip-${ep}`}
                    onClick={() => {
                      console.log(`🎬 Episode clicked: ${ep} (Season ${currentSeason})`);
                      console.log(`📋 Episodes list: ${episodesList.join(', ')}`);
                      console.log(`🔍 Is ${ep} in episodesList? ${episodesList.includes(ep)}`);
                      setIsLoadingVideo(true);
                      setCurrentEpisode(ep);
                    }}
                    className={`h-10 w-12 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? "accent-active" 
                        : "bg-[#0a0a0a]/40 border border-white/10 hover:border-[#22c55e]/30 text-neutral-400 hover:text-white"
                    }`}
                  >
                    EP {ep}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button Row */}
        <div id="player-action-buttons" className="max-w-5xl mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex flex-wrap gap-3">
            {/* Watchlist Toggle */}
            <button
              id="player-action-watchlist"
              onClick={handleToggleWatchlist}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                isWatchlisted 
                  ? "bg-[#39FF14]/10 border-[#39FF14] text-[#39FF14]" 
                  : "bg-[#0a0a0a]/40 border-white/10 text-neutral-400 hover:text-white hover:border-[#39FF14]/25"
              }`}
            >
              {isWatchlisted ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span>{isWatchlisted ? "Watchlisted" : "Add Watchlist"}</span>
            </button>

            {/* Favorite Toggle */}
            <button
              id="player-action-favorite"
              onClick={handleToggleFavorite}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                isFavorited 
                  ? "bg-rose-500/10 border-rose-500 text-rose-400" 
                  : "bg-[#0a0a0a]/40 border-white/10 text-neutral-400 hover:text-rose-400 hover:border-white/20"
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? "fill-rose-400" : ""}`} />
              <span>{isFavorited ? "Favorited" : "Favorite"}</span>
            </button>

            {/* Play Mode Toggles */}
            {playerMode === "trailer" ? (
              <button
                id="player-toggle-full"
                onClick={() => setPlayerMode("full")}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#39FF14] text-black hover:bg-[#39FF14]/80 transition-all cursor-pointer text-xs font-bold"
              >
                <Tv className="h-4 w-4" />
                <span>Play Full Movie</span>
              </button>
            ) : (
              trailerKey && (
                <button
                  id="player-toggle-trailer"
                  onClick={() => setPlayerMode("trailer")}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all cursor-pointer text-xs font-bold"
                >
                  <Film className="h-4 w-4" />
                  <span>Play Trailer</span>
                </button>
              )
            )}

            {/* Share button */}
            <button
              id="player-action-share"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0a0a0a]/40 border border-white/10 text-neutral-400 hover:text-white hover:border-[#39FF14]/25 transition-all cursor-pointer text-xs font-bold"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>

            <button
              id="player-action-download"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setDownloadClickPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 10 });
                setFullDownloadModalOpen(true);
              }}
              disabled={downloadBusy}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl btn-secondary text-xs font-bold cursor-pointer disabled:opacity-50"
              title="Download Full Movie"
            >
              <Download className="h-4 w-4" />
              <span>{downloadBusy ? "Saving…" : isDownloaded ? "Downloaded" : "Download"}</span>
            </button>
          </div>
          {downloadMsg && (
            <p className="text-xs font-semibold text-[#39FF14] mt-2">{downloadMsg}</p>
          )}
          {storageFull && !isDownloaded && (
            <p className="text-xs font-semibold text-rose-400 mt-2">
              Download storage full (2 GB). Delete items in Download History to free space.
            </p>
          )}

          {/* Real-time Online Indicator */}
          <div className="flex items-center gap-2 text-xs glass-card px-4 py-2 rounded-xl">
            <span className="font-sans text-neutral-500">VidSrc Status:</span>
            <span className="font-sans font-bold text-[#39FF14] flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#39FF14]" />
              Direct 1080p
            </span>
          </div>
        </div>

        {/* Title & Overview */}
        <div id="player-metadata-section" className="max-w-5xl mt-6 space-y-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-sans font-black text-3xl text-white tracking-tight">
              {selectedMovie.title || selectedMovie.name}
            </h1>
            <span className="text-neutral-500 text-sm font-mono font-medium">
              {selectedMovie.release_date || selectedMovie.first_air_date}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg">
              <Star className="h-3.5 w-3.5 fill-yellow-400 stroke-none" />
              <span>{selectedMovie.vote_average?.toFixed(1) || "N/A"}</span>
            </div>
          </div>

          <p className="text-neutral-400 text-sm leading-relaxed max-w-4xl font-sans">
            {selectedMovie.overview}
          </p>
        </div>

        {/* Cast & Crew Section */}
        {cast && cast.length > 0 && (
          <div id="player-cast-section" className="max-w-5xl mt-10 space-y-4">
            <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-500" />
              <span>{t("castCrew")}</span>
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
              {cast.slice(0, 10).map((member, idx) => (
                <div key={idx} className="flex-none w-24 text-center space-y-2">
                  <img 
                    src={member.profile_path ? getImageUrl(member.profile_path, "w500") : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"} 
                    alt={member.name} 
                    className="h-20 w-20 rounded-full object-cover border border-white/5 mx-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-xs font-bold text-white truncate">{member.name}</p>
                    <p className="text-[10px] text-neutral-500 truncate">{member.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-5xl mt-8">
          <button
            onClick={() => setShowLiveChat((prev) => !prev)}
            className="w-full max-w-2xl mx-auto flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0a0a0a]/70 px-4 py-4 text-left transition hover:bg-white/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#39FF14]/15 text-[#39FF14]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{t("liveChatComments")}</p>
              <p className="text-[11px] text-neutral-400">{t("openDiscussionPanel")}</p>
            </div>
            <span className="ml-auto text-[11px] font-bold text-[#39FF14]">
              {showLiveChat ? t("hide") : t("open")}
            </span>
          </button>

          {showLiveChat && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-[#0a0a0a] p-4">
              <LiveChat />
            </div>
          )}
        </div>

        {/* Recommended & Similar Shelves */}
        <div id="player-recommendations" className="max-w-5xl mt-12 space-y-10">
          
          {/* Similar Movies Shelf */}
          {similarMovies && similarMovies.length > 0 && (
            <div id="shelf-similar" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-sans font-bold text-lg text-white">
                  {t("similarTitles")}
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {similarMovies.slice(0, 8).map(m => (
                  <div key={m.id} className="w-32 flex-none sm:w-36 md:w-40">
                    <MovieCard 
                      movie={m} 
                      onClick={() => {
                        setSelectedMovie(m);
                        setIsLoadingVideo(true);
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Row */}
          {recommendations && recommendations.length > 0 && (
            <div id="shelf-recommendations" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-sans font-bold text-lg text-white">
                  {t("recommendedForYou")}
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {recommendations.slice(0, 8).map(m => (
                  <div key={m.id} className="w-32 flex-none sm:w-36 md:w-40">
                    <MovieCard 
                      movie={m} 
                      onClick={() => {
                        setSelectedMovie(m);
                        setIsLoadingVideo(true);
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar Column — Up Next queue only; Live Chat has moved below cast. */}
      <div 
        id="player-sidebar" 
        className="w-full lg:w-96 flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0a0a0a]/40 lg:p-6 p-4 flex-none lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto min-h-0"
      >
        {(recommendations.length > 0 || similarMovies.length > 0) && (
          <>
            <UpNextQueue
              movies={(recommendations.length > 0 ? recommendations : similarMovies).slice(0, 10)}
              onSelect={(m) => {
                setSelectedMovie(m);
                setIsLoadingVideo(true);
              }}
            />
            <UpNextActions
              movies={(recommendations.length > 0 ? recommendations : similarMovies).slice(0, 10)}
              onSelect={(m) => {
                setSelectedMovie(m);
                setIsLoadingVideo(true);
              }}
              onShuffle={() => {
                const pool = (recommendations.length > 0 ? recommendations : similarMovies).slice(0, 10);
                const pick = pool[Math.floor(Math.random() * pool.length)];
                if (pick) {
                  setSelectedMovie(pick);
                  setIsLoadingVideo(true);
                }
              }}
              isTv={isTv}
              onBinge={() => {
                if (episodesList.length > 0) {
                  const idx = episodesList.indexOf(currentEpisode);
                  const next = idx >= 0 && idx < episodesList.length - 1 ? episodesList[idx + 1] : episodesList[0];
                  console.log(`🎬 Binge watch: Next episode ${next} (Season ${currentSeason})`);
                  setIsLoadingVideo(true);
                  setCurrentEpisode(next);
                }
              }}
            />
          </>
        )}
      </div>

      {/* Share Dialog Popup Modal */}
      {shareOpen && (
        <div id="share-dialog-backdrop" className="fixed inset-0 z-60 flex items-center justify-center bg-[#0a0a0a]/70 backdrop-blur-sm p-4">
          <div id="share-dialog" className="glass-card p-6 rounded-3xl w-full max-w-sm text-center relative border border-white/10 bg-[#0a0a0a]/95">
            <button 
              id="close-share-btn"
              onClick={() => setShareOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <Sparkles className="h-8 w-8 text-[#39FF14] mx-auto mb-4" />
            <h3 className="font-sans font-black text-lg text-white mb-2">Share This Stream</h3>
            <p className="text-xs text-neutral-400 mb-6">Let your friends join the premium Cinemax watch discussion group in real-time!</p>
            
            <div className="flex gap-2 bg-[#0a0a0a]/80 p-2.5 rounded-2xl border border-white/5 items-center justify-between mb-4">
              <span className="text-[10px] text-neutral-400 font-mono truncate select-all">{window.location.href}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard successfully!");
                }}
                className="bg-[#39FF14]/10 hover:bg-[#39FF14]/20 text-[#39FF14] font-bold text-[10px] uppercase px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOWNLOAD CHOICE MODAL */}
      <DownloadChoiceModal
        movie={selectedMovie}
        isOpen={downloadChoiceOpen}
        onClose={() => setDownloadChoiceOpen(false)}
        onChoose={(choice) => handleDownload(choice)}
      />

      {/* FULL MOVIE DOWNLOAD MODAL */}
      <FullMovieDownloadModal
        movie={selectedMovie}
        isOpen={fullDownloadModalOpen}
        onClose={() => {
          setFullDownloadModalOpen(false);
          setFullDownloadResult(null);
          setDownloadClickPosition(null);
        }}
        onDownload={handleFullMovieDownload}
        isDownloading={downloadBusy}
        downloadResult={fullDownloadResult}
        clickPosition={downloadClickPosition}
      />

    </div>
  );
};
