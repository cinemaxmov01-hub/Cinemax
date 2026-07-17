import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { MovieCard } from "./components/MovieCard";
import { WatchChoiceModal } from "./components/WatchChoiceModal";
import { PlayerPage } from "./components/PlayerPage";
import { ProfilePage } from "./components/ProfilePage";
import { DownloadsPage } from "./components/DownloadsPage";
import { HelpDeskPage } from "./components/HelpDeskPage";
import { AdminRedirect } from "./components/AdminRedirect";
import { AdBanner } from "./components/AdBanner";
import { MaintenanceScreen } from "./components/MaintenanceScreen";
import { AuthModal } from "./components/AuthModal";
import { PipPlayer } from "./components/PipPlayer";
import { AvatarRenderer } from "./components/AnimatedAvatar";
import { NotificationCenter } from "./components/NotificationCenter";
import { LandingPage } from "./components/LandingPage";
import { CinemaxLogo } from "./components/CinemaxLogo";
import { AboutPage } from "./components/AboutPage";
import { MoviesPage } from "./components/MoviesPage";
import { InstallAppButton } from "./components/InstallAppButton";
import { TVShowsPage } from "./components/TVShowsPage";
import { ShortsPage } from "./components/ShortsPage";
import { GensPage } from "./components/GensPage";
import { HomeAIAssistant } from "./components/HomeAIAssistant";
import { VoiceAgent } from "./components/VoiceAgent";
import { MovieDetailsModal } from "./components/MovieDetailsModal";
import { Footer } from "./components/Footer";
import { LiveChat } from "./components/LiveChat";
import { AdminDestinationModal } from "./components/AdminDestinationModal";
import { OnboardingPreferences } from "./components/OnboardingPreferences";
import { tmdb, getImageUrl, isTvShow, prepareForPlayback } from "./utils/tmdb";
import { getConversationalAgent, ConversationalResponse, SUPPORTED_LANGUAGES } from "./lib/conversationalAIAgent";
import {
  filterHiddenMovies,
  applyTrendingOverride,
  loadFeaturedMovies,
  fetchPublicAds,
  PublicAd,
} from "./utils/siteConfig";
import { Movie } from "./types";
import { 
  Search, 
  Bell, 
  Menu, 
  Star, 
  Play, 
  Info, 
  Bookmark, 
  Heart, 
  History as HistoryIcon,
  Download,
  Tv,
  ChevronRight,
  ListPlus,
  Lock,
  Tag,
  X as XIcon,
  Mic
} from "lucide-react";

// Pre-configured "Supergirl" Featured Hero Movie matching references
const SUPERGIRL_HERO: Movie = {
  id: 502356,
  title: "Supergirl",
  overview: "Kara Zor-El faces new challenges as she embraces her destiny in a world that needs a hero.",
  poster_path: "/subfash_supergirl_poster.jpg",
  backdrop_path: "/z993883u82.jpg",
  vote_average: 8.2,
  release_date: "2023-06-16",
  genres: [{ id: 28, name: "Action" }, { id: 878, name: "Sci-Fi" }],
  runtime: 124,
};

const HERO_FALLBACK_BACKDROP = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1400&auto=format&fit=crop";

const ONBOARDING_GENRE_ID_MAP: Record<string, number> = {
  action: 28,
  comedy: 35,
  drama: 18,
  horror: 27,
  romance: 10749,
  thriller: 53,
  "sci-fi": 878,
  animation: 16,
  documentary: 99,
  music: 10402,
  fantasy: 14,
  crime: 80,
};

const CinemaxDashboard: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    selectedMovie, 
    setSelectedMovie, 
    playerMode, 
    setPlayerMode,
    searchQuery, 
    setSearchQuery, 
    user,
    activeGenre,
    setActiveGenre,
    activeGenreName,
    setActiveGenreName,
    rememberChoice,
    defaultWatchChoice,
    addToWatchlist,
    unreadCount,
    authLoading,
    requireSignInPrompt,
    enterAsGuest,
    isGuest,
    authModalOpen,
    authModalMode,
    authModalInitialStep,
    authModalPrefillEmail,
    openAuthModal,
    openForgotPasswordModal,
    closeAuthModal,
    t,
    adminDestinationOpen,
    goToAdminPanel,
    dismissAdminToWebsite,
    siteConfig,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [allGenres, setAllGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [modalTargetMovie, setModalTargetMovie] = useState<Movie | null>(null);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [isConversationalAIActive, setIsConversationalAIActive] = useState(false);
  const [aiResponse, setAIResponse] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('english');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [showTranscriptPopup, setShowTranscriptPopup] = useState(false);
  
  const conversationalAgent = useRef(getConversationalAgent());
  const [heroIndex, setHeroIndex] = useState(0);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalMovie, setDetailsModalMovie] = useState<Movie | null>(null);

  // Splash Screen ihita yizima niba user amaze kwinjira neza
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  // TMDB Lists state
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [trendingTV, setTrendingTV] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [customContent, setCustomContent] = useState<Movie[]>([]);
  const [featuredHeroMovies, setFeaturedHeroMovies] = useState<Movie[]>([]);
  const [publicAds, setPublicAds] = useState<PublicAd[]>([]);
  const [personalizedMovies, setPersonalizedMovies] = useState<Record<string, Movie[]>>({});

  // Search/Filters results state
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [genreFilteredMovies, setGenreFilteredMovies] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchNextPage, setSearchNextPage] = useState(4);
  const searchSentinelRef = useRef<HTMLDivElement>(null);
  const [preparingPlayKey, setPreparingPlayKey] = useState<string | null>(null);

  // Load lists
  useEffect(() => {
    const loadAllLists = async () => {
      try {
        const hiddenIds = siteConfig?.hiddenMovieIds || [];
        const trendingOverride = siteConfig?.trendingOverrideIds || [];
        const featuredIds = siteConfig?.featuredMovieIds || [];

        const [trendingM, trendingT, popular, top, up, now] = await Promise.all([
          tmdb.getTrendingMovies(),
          tmdb.getTrendingTVShows(),
          tmdb.getPopularMovies(),
          tmdb.getTopRatedMovies(),
          tmdb.getUpcomingMovies(),
          tmdb.getNowPlayingMovies(),
        ]);

        const applyHidden = (list: Movie[]) => filterHiddenMovies(list, hiddenIds);
        let curatedTrending = applyHidden(trendingM);
        if (trendingOverride.length) {
          curatedTrending = await applyTrendingOverride(curatedTrending, trendingOverride);
        }

        setTrendingMovies(curatedTrending);
        setTrendingTV(applyHidden(trendingT));
        setPopularMovies(applyHidden(popular));
        setTopRated(applyHidden(top));
        setUpcoming(applyHidden(up));
        setNowPlaying(applyHidden(now));

        if (featuredIds.length) {
          setFeaturedHeroMovies(await loadFeaturedMovies(featuredIds));
        } else {
          setFeaturedHeroMovies([]);
        }

        try {
          const customRes = await fetch("/api/content/custom");
          if (customRes.ok) {
            const { movies } = await customRes.json();
            setCustomContent(movies || []);
          }
        } catch {
          // Fallback if API fails
        }

        try {
          setPublicAds(await fetchPublicAds());
        } catch {
          setPublicAds([]);
        }

        const genreList = await tmdb.getGenres("movie");
        try {
          const catRes = await fetch("/api/categories/public");
          if (catRes.ok) {
            const { hiddenIds: hiddenGenreIds, labels } = await catRes.json();
            const hiddenSet = new Set(hiddenGenreIds || []);
            setAllGenres(
              genreList
                .filter((g: { id: number }) => !hiddenSet.has(g.id))
                .map((g: { id: number; name: string }) => ({
                  id: g.id,
                  name: labels?.[String(g.id)] || g.name,
                }))
            );
          } else {
            setAllGenres(genreList);
          }
        } catch (err) {
          setAllGenres(genreList);
        }
      } catch (err) {
        console.error("Failed to load TMDB lists on app startup:", err);
      }
    };
    loadAllLists();
  }, [siteConfig]);

  // Uburyo bunoze bwo gushaka Personalized Movies badasomye ku buryo bu-crasha
  useEffect(() => {
    const favoriteGenres = user?.onboarding?.favoriteGenres;
    if (!favoriteGenres || favoriteGenres.length === 0) {
      setPersonalizedMovies({});
      return;
    }
    let cancelled = false;
    (async () => {
      const hiddenIds = siteConfig?.hiddenMovieIds || [];
      const entries = await Promise.all(
        favoriteGenres
          .map((g) => g.toLowerCase())
          .filter((g) => ONBOARDING_GENRE_ID_MAP[g])
          .map(async (genreKey) => {
            try {
              const { results } = await tmdb.discoverMoviesByGenre(ONBOARDING_GENRE_ID_MAP[genreKey]);
              return [genreKey, filterHiddenMovies(results, hiddenIds)] as const;
            } catch {
              return [genreKey, []] as const;
            }
          })
      );
      if (!cancelled) {
        setPersonalizedMovies(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, siteConfig]);

  // Splash Screen timer
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeSplash(true);
    }, 600);

    const unmountTimer = setTimeout(() => {
      setShowSplash(false);
    }, 950);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  const heroMovies =
    featuredHeroMovies.length > 0
      ? featuredHeroMovies
      : trendingMovies.length > 0
        ? [SUPERGIRL_HERO, ...trendingMovies.slice(0, 4)]
        : [SUPERGIRL_HERO];
  const heroMovie = heroMovies[heroIndex % heroMovies.length];

  useEffect(() => {
    if (heroMovies.length < 2) return;
    const intervalId = setInterval(() => setHeroIndex((i) => (i + 1) % heroMovies.length), 4000);
    return () => clearInterval(intervalId);
  }, [heroMovies.length]);

  // Conversational Voice AI Agent setup
  useEffect(() => {
    const agent = conversationalAgent.current;
    
    agent.onTranscript((text: string, language: string) => {
      setInterimTranscript('');
      setShowTranscriptPopup(false);
    });

    agent.onInterimTranscript((text: string) => {
      setInterimTranscript(text);
      if (text.length > 10) {
        setShowTranscriptPopup(true);
      }
    });

    agent.onResponse(async (response: ConversationalResponse) => {
      setAIResponse(response.text);
      await agent.speak(response.text, response.language);
      
      if (response.shouldSearch && response.searchQuery) {
        setSearchQuery(response.searchQuery);
        
        if (response.searchQuery.trim().length > 1) {
          try {
            const [tmdbBatch, customMatches] = await Promise.all([
              tmdb.searchEverything(response.searchQuery.trim(), { startPage: 1, pageCount: 3 }),
              tmdb.searchCustomContent(response.searchQuery.trim()),
            ]);
            const seen = new Set<string>();
            const combined: Movie[] = [];
            for (const item of [...tmdbBatch.results, ...customMatches]) {
              const key = `${item.media_type || (item.title ? "movie" : "tv")}:${item.id}`;
              if (!seen.has(key)) {
                seen.add(key);
                combined.push(item);
              }
            }
            setSearchResults(combined);
            setSearchHasMore(tmdbBatch.hasMore);
            setSearchNextPage(4);
            
            const resultResponse = agent.handleSearchResults(combined, response.language);
            await agent.speak(resultResponse.text, resultResponse.language);
          } catch (err) {
            const errorResponse = agent.handleUnknownData(response.searchQuery, response.language);
            await agent.speak(errorResponse.text, errorResponse.language);
          }
        }
      }
    });

    return () => {
      agent.destroy();
    };
  }, [setSearchQuery]);

  const toggleConversationalAI = () => {
    const agent = conversationalAgent.current;
    if (!agent.isActive()) {
      const success = agent.startListening();
      if (success) {
        setIsConversationalAIActive(true);
        const langCode = SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES]?.code || 'en';
        agent.speak("How can I help you?", langCode);
      } else {
        alert('Voice assistant not supported.');
      }
    } else {
      agent.stopListening();
      setIsConversationalAIActive(false);
      setAIResponse(null);
    }
  };

  // Search
  useEffect(() => {
    if (searchQuery.trim().length <= 1) {
      setSearchResults([]);
      setSearchHasMore(false);
      setSearchNextPage(4);
      return;
    }

    setIsSearching(true);
    const q = searchQuery.trim();
    const delayDebounce = setTimeout(async () => {
      try {
        const [tmdbBatch, customMatches] = await Promise.all([
          tmdb.searchEverything(q, { startPage: 1, pageCount: 3 }),
          tmdb.searchCustomContent(q),
        ]);
        const seen = new Set<string>();
        const combined: Movie[] = [];
        for (const item of [...customMatches, ...tmdbBatch.results]) {
          const key = `${item.media_type || (item.title ? "movie" : "tv")}:${item.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push(item);
        }
        setSearchResults(combined);
        setSearchHasMore(tmdbBatch.hasMore);
        setSearchNextPage(4);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const loadMoreSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length <= 1 || searchLoadingMore || !searchHasMore) return;
    setSearchLoadingMore(true);
    try {
      const batch = await tmdb.searchEverything(q, { startPage: searchNextPage, pageCount: 2 });
      setSearchResults((prev) => {
        const seen = new Set(prev.map((m) => `${m.media_type || (m.title ? "movie" : "tv")}:${m.id}`));
        const added = batch.results.filter((m) => {
          const key = `${m.media_type || (m.title ? "movie" : "tv")}:${m.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...prev, ...added];
      });
      setSearchHasMore(batch.hasMore);
      setSearchNextPage((p) => p + 2);
    } catch (err) {
      console.error("Search pagination error:", err);
    } finally {
      setSearchLoadingMore(false);
    }
  }, [searchQuery, searchLoadingMore, searchHasMore, searchNextPage]);

  useEffect(() => {
    const el = searchSentinelRef.current;
    if (!el || searchQuery.trim().length <= 1) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreSearch();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [searchQuery, loadMoreSearch, searchHasMore]);

  // Genre Filters
  useEffect(() => {
    if (activeGenre !== null) {
      const loadGenreMovies = async () => {
        try {
          const allPool = [
            ...trendingMovies,
            ...popularMovies,
            ...topRated,
            ...upcoming,
            ...nowPlaying,
            ...trendingTV
          ];
          const uniquePool = Array.from(new Map(allPool.map(item => [item.id, item])).values());
          
          let filtered: Movie[] = [];
          if (typeof activeGenre === "number") {
            filtered = uniquePool.filter(m => m.genre_ids?.includes(activeGenre));
          } else {
            switch (activeGenre) {
              case "trending":
                filtered = [...trendingMovies];
                break;
              case "popular":
                filtered = [...popularMovies];
                break;
              case "top_rated":
                filtered = [...topRated];
                break;
              case "upcoming":
                filtered = [...upcoming];
                break;
              case "now_playing":
                filtered = [...nowPlaying];
                break;
              default:
                filtered = uniquePool;
            }
          }
          setGenreFilteredMovies(filtered);
        } catch (err) {
          console.error(err);
        }
      };
      loadGenreMovies();
    } else {
      setGenreFilteredMovies([]);
    }
  }, [activeGenre, trendingMovies, popularMovies, topRated, upcoming, nowPlaying, trendingTV]);

  const handleMovieClick = async (movie: Movie) => {
    const playKey = `${movie.media_type || (isTvShow(movie) ? "tv" : "movie")}:${movie.id}`;
    setPreparingPlayKey(playKey);
    setSearchQuery("");
    try {
      const ready = await prepareForPlayback(movie);
      if (rememberChoice && defaultWatchChoice) {
        setSelectedMovie(ready);
        setPlayerMode(defaultWatchChoice);
        setCurrentView("player");
      } else {
        setModalTargetMovie(ready);
        setChoiceModalOpen(true);
      }
    } catch (err) {
      const fallback: Movie = {
        ...movie,
        media_type: movie.media_type ?? (isTvShow(movie) ? "tv" : "movie"),
      };
      setModalTargetMovie(fallback);
      setChoiceModalOpen(true);
    } finally {
      setPreparingPlayKey(null);
    }
  };

  const handlePlayFullMovie = async (movie: Movie) => {
    const playKey = `${movie.media_type || (isTvShow(movie) ? "tv" : "movie")}:${movie.id}`;
    setPreparingPlayKey(playKey);
    try {
      const ready = await prepareForPlayback(movie);
      setSelectedMovie(ready);
      setPlayerMode("full");
      setChoiceModalOpen(false);
      setCurrentView("player");
    } catch {
      setSelectedMovie({
        ...movie,
        media_type: movie.media_type ?? (isTvShow(movie) ? "tv" : "movie"),
      });
      setPlayerMode("full");
      setChoiceModalOpen(false);
      setCurrentView("player");
    } finally {
      setPreparingPlayKey(null);
    }
  };

  const handleChoiceSelected = (choice: "full" | "trailer") => {
    if (!modalTargetMovie) return;
    setSelectedMovie(modalTargetMovie);
    setPlayerMode(choice);
    setChoiceModalOpen(false);
    setCurrentView("player");
  };

  const getContinueWatchingMovies = () => {
    if (!user?.watchHistory) return [];
    const inProgress = user.watchHistory.filter(h => h.progress > 0 && h.progress < 100);
    const all = [...trendingMovies, ...trendingTV, ...popularMovies, ...topRated];
    return inProgress.map(h => {
      const found = all.find(m => m.id === h.id);
      return found ? { ...found, _progress: h.progress, _season: h.season, _episode: h.episode } : null;
    }).filter(Boolean) as (Movie & { _progress?: number; _season?: number; _episode?: number })[];
  };

  const renderGuestLock = (label: string) => (
    <div className="text-center py-24 text-neutral-500 space-y-4">
      <div className="h-14 w-14 rounded-2xl surface-elevated flex items-center justify-center mx-auto text-neutral-400">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="font-sans font-bold text-lg text-neutral-300">Sign in to view {label}</h3>
      <p className="text-xs max-w-sm mx-auto">You're browsing as a guest. Create a free account or sign in to unlock this.</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => requireSignInPrompt()}
          className="neon-btn inline-flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all cursor-pointer"
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => openForgotPasswordModal()}
          className="btn-forgot inline-flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide cursor-pointer"
        >
          Forgot Password
        </button>
      </div>
    </div>
  );

  const renderRowShelf = (title: string, movies: Movie[], hasRank = false, seeAllTarget?: { view: "movies" | "tv"; genre?: string | number | null; genreLabel?: string }) => {
    if (movies.length === 0) return null;
    return (
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 bg-[#22c55e] rounded-full" />
            <h3 className="font-sans font-extrabold text-lg tracking-tight text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={() => {
              if (seeAllTarget) {
                setActiveGenre(seeAllTarget.genre ?? null);
                setActiveGenreName(seeAllTarget.genreLabel ?? title);
                setCurrentView(seeAllTarget.view);
              } else {
                setCurrentView("movies");
              }
            }}
            className="flex items-center gap-1 text-xs font-semibold text-[#39FF14] hover:text-[#31dd11] transition-colors cursor-pointer"
          >
            <span>See All</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-900 scrollbar-track-transparent">
          {movies.map((movie, index) => (
            <div key={movie.id} className="flex-none w-[130px] sm:w-[150px]">
              <MovieCard
                movie={movie}
                rank={hasRank ? index + 1 : undefined}
                onClick={() => handleMovieClick(movie)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Splash screen ikoresha ifade neza mu kurinda black screen
  const splashScreen = (
    <div
      id="splash-loader-screen"
      className={`fixed inset-0 z-[10000] bg-[#050505] on-dark-bg flex flex-col items-center justify-center transition-opacity duration-500 ease-out ${fadeSplash ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-6 max-w-sm px-6 text-center">
        <div className="h-20 w-20 rounded-3xl logo-mark flex items-center justify-center animate-pulse">
          <svg
            className="h-10 w-10 text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2Z" />
            <path d="M2 7h20" />
            <path d="m14 2-4 5" />
            <path d="m8 2-4 5" />
            <path d="m20 2-4 5" />
            <path d="M10 11H7v7h3V11Z" />
            <path d="M17 11h-3v7h3V11Z" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <span className="text-2xl font-black tracking-tighter flex items-center justify-center select-none font-sans">
            <span className="brand-cinema text-white">CINEMA</span><span className="brand-x text-[#39FF14]">X</span>
          </span>
          <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase font-black">
            STRICTLY MOVIES & SERIES ONLY
          </p>
        </div>
      </div>
    </div>
  );

  if (showSplash || authLoading) {
    return splashScreen;
  }

  const inMaintenance = siteConfig?.maintenanceMode && user?.role !== "admin";
  if (inMaintenance) {
    return (
      <MaintenanceScreen
        siteName={siteConfig?.siteName || "Cinemax"}
        heroTagline={siteConfig?.heroTagline}
      />
    );
  }

  const homepageAdsTop = publicAds.filter((a) => a.placement === "homepage_top");
  const homepageAdsMid = publicAds.filter((a) => a.placement === "homepage_mid");

  // Mutekano usesekuye kuri onboarding checks (Ubu ntabwo byakunda gu-crasha pe)
  const favoriteGenres = user?.onboarding?.favoriteGenres || [];
  const personalizedSections = favoriteGenres
    .filter((genre) => genre && ONBOARDING_GENRE_ID_MAP[genre.toLowerCase()])
    .map((genre) => ({
      id: `personalized_${genre}`,
      genreKey: genre.toLowerCase(),
      label: `Because You Like ${genre.charAt(0).toUpperCase() + genre.slice(1)}`,
      genreId: ONBOARDING_GENRE_ID_MAP[genre.toLowerCase()],
      visible: true,
    }));

  const homepageSectionData = {
    trending: { movies: trendingMovies, hasRank: true, seeAll: { view: "movies" as const, genre: "trending", genreLabel: "Trending Now" } },
    tv: { movies: trendingTV, seeAll: { view: "tv" as const, genre: "tv", genreLabel: "Trending TV Shows" } },
    popular: { movies: popularMovies, seeAll: { view: "movies" as const, genre: "popular", genreLabel: "Popular Movies" } },
    top_rated: { movies: topRated, seeAll: { view: "movies" as const, genre: "top_rated", genreLabel: "Top Rated Classics" } },
    upcoming: { movies: upcoming, seeAll: { view: "movies" as const, genre: "upcoming", genreLabel: "Upcoming Releases" } },
    now_playing: { movies: nowPlaying, seeAll: { view: "movies" as const, genre: "now_playing", genreLabel: "Now Playing in Cinemas" } },
  };

  const renderMainViewContent = () => {
    switch (currentView) {
      case "player":
        return <PlayerPage />;
      
      case "movies":
        return <MoviesPage />;

      case "tv":
        return <TVShowsPage />;

      case "shorts":
        return <ShortsPage />;

      case "gens":
        return <GensPage />;

      case "profile":
        return isGuest ? renderGuestLock("Profile Settings") : <ProfilePage />;

      case "downloads":
        return isGuest ? renderGuestLock("Downloads") : <DownloadsPage />;

      case "help":
        return <HelpDeskPage />;

      case "about":
        return <AboutPage />;

      case "home":
      default:
        if (searchQuery.trim().length > 1) {
          return (
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  Search Results for "{searchQuery}"
                </h2>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Clear search
                </button>
              </div>

              {isSearching && searchResults.length === 0 ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#39FF14]" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 space-y-2">
                  <p>No titles match "{searchQuery}".</p>
                  <p className="text-xs">Try looking for action, sci-fi, anime, or specific keywords.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {searchResults.map((m) => (
                    <MovieCard key={m.id} movie={m} onClick={() => handleMovieClick(m)} />
                  ))}
                </div>
              )}
              <div ref={searchSentinelRef} className="h-10 w-full" />
              {searchLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#39FF14]" />
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-8">
            {homepageAdsTop.map((ad) => (
              <AdBanner key={ad.id} ad={ad} />
            ))}

            {heroMovie && (
              <div className="relative h-[320px] sm:h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                <div className="absolute inset-0">
                  <img
                    src={
                      heroMovie.backdrop_path === "/z993883u82.jpg"
                        ? HERO_FALLBACK_BACKDROP
                        : getImageUrl(heroMovie.backdrop_path || heroMovie.poster_path, "original")
                    }
                    alt={heroMovie.title || heroMovie.name}
                    className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-4 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#39FF14] text-black font-mono font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
                      Featured Hero
                    </span>
                    {heroMovie.vote_average && (
                      <span className="text-xs text-neutral-300 font-bold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 stroke-none" /> {heroMovie.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-sans drop-shadow">
                    {heroMovie.title || heroMovie.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 sm:line-clamp-2 max-w-lg leading-relaxed drop-shadow">
                    {heroMovie.overview}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleMovieClick(heroMovie)}
                      className="px-6 py-2.5 bg-white text-black hover:bg-[#39FF14] transition-all duration-300 rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-[#39FF14]/20"
                    >
                      <Play className="h-4 w-4 fill-black" />
                      <span>Play Now</span>
                    </button>
                    <button
                      onClick={() => {
                        setDetailsModalMovie(heroMovie);
                        setDetailsModalOpen(true);
                      }}
                      className="px-5 py-2.5 surface-elevated text-white hover:bg-neutral-800 border border-white/10 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Info className="h-4 w-4" />
                      <span>Info</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {user && getContinueWatchingMovies().length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <HistoryIcon className="h-4 w-4 text-[#39FF14]" />
                  <h3 className="font-sans font-extrabold text-lg tracking-tight text-white">
                    Continue Watching
                  </h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                  {getContinueWatchingMovies().map((m) => (
                    <div key={m.id} className="flex-none w-[180px] space-y-1.5 relative group cursor-pointer" onClick={() => handleMovieClick(m)}>
                      <div className="aspect-video w-full rounded-xl overflow-hidden relative border border-white/10">
                        <img
                          src={getImageUrl(m.backdrop_path || m.poster_path, "w500")}
                          alt={m.title || m.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
                          <div className="h-full bg-[#39FF14]" style={{ width: `${m._progress}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-neutral-300 line-clamp-1">{m.title || m.name}</span>
                        {m._season && <span className="text-[10px] text-[#39FF14] font-semibold">S{m._season}:E{m._episode}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {personalizedSections.map((section) => {
              const moviesForGenre = personalizedMovies[section.genreKey] || [];
              return renderRowShelf(section.label, moviesForGenre, false, {
                view: "movies",
                genre: section.genreId,
                genreLabel: section.label,
              });
            })}

            {homepageAdsMid.map((ad) => (
              <AdBanner key={ad.id} ad={ad} />
            ))}

            {renderRowShelf("Trending Worldwide", homepageSectionData.trending.movies, true, homepageSectionData.trending.seeAll)}
            {renderRowShelf("Curated TV Shows", homepageSectionData.tv.movies, false, homepageSectionData.tv.seeAll)}
            {renderRowShelf("Popular Blockbusters", homepageSectionData.popular.movies, false, homepageSectionData.popular.seeAll)}
            {renderRowShelf("Top Rated Legends", homepageSectionData.top_rated.movies, false, homepageSectionData.top_rated.seeAll)}
            {renderRowShelf("Highly Anticipated", homepageSectionData.upcoming.movies, false, homepageSectionData.upcoming.seeAll)}
            {renderRowShelf("Now In Theatres", homepageSectionData.now_playing.movies, false, homepageSectionData.now_playing.seeAll)}

            <HomeAIAssistant />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans antialiased overflow-x-hidden selection:bg-[#39FF14] selection:text-black">
      <div className="fixed inset-y-0 right-0 w-[40vw] pointer-events-none bg-gradient-to-l from-emerald-950/10 via-transparent to-transparent blur-3xl z-0" />
      <div className="fixed top-0 left-[20%] w-[30vw] h-[30vh] pointer-events-none bg-[#39FF14]/5 blur-[120px] rounded-full z-0" />

      <div className="flex flex-1 relative z-10">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-screen px-4 sm:px-8 pb-24 lg:pb-12 pt-6">
          <header className="flex items-center justify-between gap-4 mb-6 relative">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden h-10 w-10 rounded-xl surface-elevated flex items-center justify-center border border-white/10 text-neutral-300 hover:text-white transition-all"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#39FF14] animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase font-black">
                  Streaming Online
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block w-64 xl:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search strictly movies & tv shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121212] border border-white/15 focus:border-[#39FF14]/60 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={toggleConversationalAI}
                className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer relative ${
                  isConversationalAIActive 
                    ? "bg-[#39FF14] text-black border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.4)]" 
                    : "surface-elevated text-neutral-400 border-white/10 hover:border-[#39FF14]/30 hover:text-[#39FF14]"
                }`}
                title="Open AI Voice Assistant"
              >
                <Mic className="h-4 w-4" />
                {isConversationalAIActive && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </button>

              <NotificationCenter />
              
              <div 
                onClick={() => isGuest ? requireSignInPrompt() : setCurrentView("profile")}
                className="h-10 w-10 rounded-xl overflow-hidden border border-white/10 cursor-pointer surface-elevated p-1"
              >
                <AvatarRenderer avatar={user?.avatar || "avatar1"} className="w-full h-full object-cover" />
              </div>
            </div>
          </header>

          <div className="flex-1">
            {renderMainViewContent()}
          </div>

          <Footer />
        </main>
      </div>

      <WatchChoiceModal
        isOpen={choiceModalOpen}
        onClose={() => setChoiceModalOpen(false)}
        movieName={modalTargetMovie?.title || modalTargetMovie?.name || ""}
        onSelectChoice={handleChoiceSelected}
      />

      {detailsModalMovie && (
        <MovieDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setDetailsModalMovie(null);
          }}
          movie={detailsModalMovie}
          onPlay={handlePlayFullMovie}
        />
      )}

      {showTranscriptPopup && (
        <div className="fixed bottom-24 right-6 bg-black/95 border border-[#39FF14]/30 text-white rounded-2xl p-4 shadow-2xl max-w-sm z-[9999] animate-fade-in flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-ping mt-1.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">Live Speech Transcript</span>
            <p className="text-xs text-neutral-200 leading-normal italic">"{interimTranscript}"</p>
          </div>
        </div>
      )}

      <AuthModal />
      <PipPlayer />
      <LiveChat />
      <AdminDestinationModal />
    </div>
  );
};

export default CinemaxDashboard;
