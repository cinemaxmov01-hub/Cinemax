import React, { useEffect, useMemo, useState } from "react";
import {
  Crown, Zap, Download, ShieldOff, Star, Sparkles,
  Heart, Loader2, Lock, ChevronRight, Play, Bookmark, Flame,
  Tv, LayoutGrid, ShieldCheck, Headphones, Smartphone, CalendarClock,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { PremiumMovieCard } from "./PremiumMovieCard";
import { GensPage } from "./GensPage";
import { tmdb, getImageUrl } from "../utils/tmdb";
import { Movie } from "../types";

type PremiumTab = "overview" | "exclusive" | "gens";

interface PremiumPageProps {
  /** Which internal tab to open on mount — lets the header's "Gens"
   *  history (currentView === "gens") land straight on that tab. */
  initialTab?: PremiumTab;
  /** Keeps App's currentView in sync ("gens" vs "premium") so the header
   *  nav button's active state and browser-level view stay correct even
   *  though Gens now lives inside this page instead of its own route. */
  onNavigateTab?: (tab: PremiumTab) => void;
  onMovieClick: (movie: Movie) => void;
}

const BENEFIT_PILLS = [
  { icon: Zap, label: "4K Ultra HD", desc: "Dolby Vision" },
  { icon: ShieldOff, label: "No Ads", desc: "Pure viewing" },
  { icon: Download, label: "Offline Downloads", desc: "Watch anywhere" },
  { icon: Headphones, label: "Priority Support", desc: "24/7 assistance" },
];

const STAT_STRIP = [
  { icon: LayoutGrid, value: "10,000+", label: "Movies & Shows" },
  { icon: Zap, value: "4K", label: "Ultra HD Quality" },
  { icon: Sparkles, value: "50+", label: "Categories" },
  { icon: ShieldCheck, value: "100%", label: "Ad Free" },
  { icon: Headphones, value: "24/7", label: "Support" },
  { icon: Download, value: "Offline", label: "Downloads" },
  { icon: Smartphone, value: "Multi-Device", label: "Support" },
  { icon: CalendarClock, value: "New", label: "Content Daily" },
];

export const PremiumPage: React.FC<PremiumPageProps> = ({ initialTab = "overview", onNavigateTab, onMovieClick }) => {
  const { user, siteConfig, isGuest, requireSignInPrompt, setCurrentView } = useApp();
  const [tab, setTab] = useState<PremiumTab>(initialTab);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const changeTab = (next: PremiumTab) => {
    setTab(next);
    onNavigateTab?.(next);
  };

  const isPremium = Boolean(user?.premium);
  const premiumOnlyIds = siteConfig.premiumOnlyMovieIds || [];

  const [exclusiveTitles, setExclusiveTitles] = useState<Movie[]>([]);
  const [exclusiveLoading, setExclusiveLoading] = useState(false);

  useEffect(() => {
    if (tab !== "exclusive") return;
    if (premiumOnlyIds.length === 0) { setExclusiveTitles([]); return; }
    let cancelled = false;
    setExclusiveLoading(true);
    Promise.allSettled(
      premiumOnlyIds.map((id) => tmdb.getMovieDetails(id).catch(() => tmdb.getTVDetails(id)))
    ).then((results) => {
      if (cancelled) return;
      const movies = results
        .filter((r): r is PromiseFulfilledResult<Movie> => r.status === "fulfilled" && Boolean(r.value))
        .map((r) => r.value);
      setExclusiveTitles(movies);
      setExclusiveLoading(false);
    });
    return () => { cancelled = true; };
  }, [tab, premiumOnlyIds.join(",")]);

  // Overview hub rows — trending movies + popular TV shows, styled with the
  // dedicated PremiumMovieCard so the hub reads as its own destination.
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  const [tvLoading, setTvLoading] = useState(false);

  useEffect(() => {
    if (tab !== "overview") return;
    let cancelled = false;
    setTrendingLoading(true);
    setTvLoading(true);
    tmdb.getTrendingMovies().then((movies) => { if (!cancelled) setTrendingMovies(movies.slice(0, 12)); }).finally(() => { if (!cancelled) setTrendingLoading(false); });
    tmdb.getPopularTVShows().then((shows) => { if (!cancelled) setPopularTV(shows.slice(0, 12)); }).finally(() => { if (!cancelled) setTvLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  // Hero collage backdrops — drawn from whatever trending titles have
  // loaded, falls back to none until data arrives.
  const collageMovies = useMemo(() => trendingMovies.slice(0, 5), [trendingMovies]);

  const tabs = useMemo(
    () => [
      { id: "overview" as PremiumTab, label: "Overview", icon: Crown },
      { id: "exclusive" as PremiumTab, label: "Exclusive Titles", icon: Sparkles },
      { id: "gens" as PremiumTab, label: "Gens (18+)", icon: Heart },
    ],
    []
  );

  return (
    <div id="premium-hub" className="min-h-screen bg-[#050301] text-white">
      {/* ================================================================ */}
      {/* Luxury dark-gold hero — deliberately distinct from every other page */}
      {/* ================================================================ */}
      <div className="relative overflow-hidden border-b border-amber-400/10 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.10),transparent_60%)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0904_0%,#050301_100%)]" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute top-1/2 -left-24 h-72 w-72 rounded-full bg-yellow-500/5 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-8">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            {/* Left: identity + pills + CTAs */}
            <div>
              <div className="flex items-center gap-3 sm:gap-4 mb-5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25">
                  <Crown className="h-6 w-6 sm:h-7 sm:w-7 text-black" fill="currentColor" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-amber-400/80 mb-0.5">Welcome to</p>
                  <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent leading-tight">
                    Cinemax Premium
                  </h1>
                </div>
              </div>

              <p className="text-sm sm:text-base text-neutral-400 max-w-lg mb-6">
                The ultimate streaming experience with exclusive titles, stunning quality, and endless entertainment.
              </p>

              {/* Current plan status */}
              {!isGuest && user && (
                <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-400/15 bg-white/[0.03] px-4 py-2.5 mb-6">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ background: isPremium ? "#fbbf24" : "#737373" }}
                  />
                  <span className="text-xs sm:text-sm font-semibold">
                    {isPremium ? (
                      <>You're on <span className="text-amber-400 font-bold">Premium</span></>
                    ) : (
                      <>You're on the <span className="font-bold">{user.subscription || "Free"}</span> plan</>
                    )}
                  </span>
                  {isPremium && user.premiumExpiresAt && (
                    <span className="text-[10px] text-neutral-500">
                      · until {new Date(user.premiumExpiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {/* Feature pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-7">
                {BENEFIT_PILLS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.label}
                      className="rounded-xl border border-amber-400/15 bg-white/[0.02] px-3 py-2.5 hover:border-amber-400/40 hover:bg-amber-400/[0.04] transition-all"
                    >
                      <div className="h-6 w-6 rounded-md border border-amber-400/30 flex items-center justify-center mb-2">
                        <Icon className="h-3 w-3 text-amber-400" />
                      </div>
                      <p className="text-[11px] sm:text-xs font-bold text-white leading-tight">{b.label}</p>
                      <p className="text-[10px] text-neutral-500">{b.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => (isGuest ? requireSignInPrompt() : setCurrentView("movies"))}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 text-black font-bold text-xs sm:text-sm px-6 py-3 hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Play className="h-4 w-4 fill-black" />
                  Start Watching
                </button>
                <button
                  onClick={() => (isGuest ? requireSignInPrompt() : setCurrentView("watchlist"))}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-white/[0.02] text-white font-bold text-xs sm:text-sm px-6 py-3 hover:border-amber-400/50 hover:bg-white/[0.05] transition-all cursor-pointer"
                >
                  <Bookmark className="h-4 w-4 text-amber-400" />
                  My Watchlist
                </button>
              </div>
            </div>

            {/* Right: poster collage */}
            <div className="relative hidden lg:block h-[340px]">
              {collageMovies.length > 0 ? (
                collageMovies.map((m, i) => {
                  const offsets = [
                    "translate-x-0 -rotate-6 z-10",
                    "translate-x-16 rotate-2 z-20 -translate-y-3",
                    "translate-x-32 -rotate-3 z-30 translate-y-2",
                    "translate-x-48 rotate-3 z-20 -translate-y-2",
                    "translate-x-64 -rotate-6 z-10 translate-y-3",
                  ];
                  return (
                    <div
                      key={m.id}
                      className={`absolute top-4 left-0 w-32 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-amber-400/20 shadow-2xl shadow-black/60 transition-transform duration-500 hover:-translate-y-2 hover:z-40 ${offsets[i] || ""}`}
                    >
                      <img
                        src={getImageUrl(m.poster_path, "w500")}
                        alt={m.title || m.name || ""}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                  );
                })
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Crown className="h-16 w-16 text-amber-400/10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#050301]" />
            </div>
          </div>
        </div>

        {/* Internal sub-navigation — Gens now lives here, not the main header */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-900 scrollbar-track-transparent pb-4">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => changeTab(t.id)}
                  className={`flex-none flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    active
                      ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-black border-transparent"
                      : "text-neutral-400 border-amber-400/10 hover:text-white hover:border-amber-400/30 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" fill={t.id === "gens" && active ? "currentColor" : "none"} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12">
          {/* Trending Movies */}
          <section>
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                <h2 className="text-base sm:text-xl font-bold">Trending Movies</h2>
              </div>
              <button
                onClick={() => setCurrentView("movies")}
                className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-amber-400/80 hover:text-amber-400 transition-colors cursor-pointer"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {trendingLoading ? (
              <div className="flex gap-3 sm:gap-4 overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-none w-[150px] sm:w-[180px] rounded-2xl overflow-hidden bg-white/[0.03] border border-amber-400/5 animate-pulse">
                    <div className="aspect-[2/3] bg-white/5" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 no-scrollbar">
                {trendingMovies.map((movie) => (
                  <PremiumMovieCard key={movie.id} movie={movie} quality="4K" onClick={() => onMovieClick(movie)} />
                ))}
              </div>
            )}
          </section>

          {/* Popular TV Shows */}
          <section>
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-2">
                <Tv className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                <h2 className="text-base sm:text-xl font-bold">Popular TV Shows</h2>
              </div>
              <button
                onClick={() => setCurrentView("tv")}
                className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-amber-400/80 hover:text-amber-400 transition-colors cursor-pointer"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {tvLoading ? (
              <div className="flex gap-3 sm:gap-4 overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-none w-[150px] sm:w-[180px] rounded-2xl overflow-hidden bg-white/[0.03] border border-amber-400/5 animate-pulse">
                    <div className="aspect-[2/3] bg-white/5" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 no-scrollbar">
                {popularTV.map((show) => (
                  <PremiumMovieCard key={show.id} movie={show} quality="HD" onClick={() => onMovieClick(show)} />
                ))}
              </div>
            )}
          </section>

          {!isPremium && (
            <div className="rounded-3xl border border-amber-400/15 bg-gradient-to-r from-amber-500/[0.06] to-yellow-500/[0.03] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">Ready to upgrade?</h3>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
                  Reach out and our team will get your account set up on Premium.
                </p>
              </div>
              <button
                onClick={() => (isGuest ? requireSignInPrompt() : setCurrentView("help"))}
                className="flex-none inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 text-black font-bold text-xs sm:text-sm uppercase tracking-wide px-6 py-3 hover:brightness-110 transition-all cursor-pointer"
              >
                {isGuest ? "Sign In" : "Contact Support"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Bottom stat strip */}
          <div className="rounded-3xl border border-amber-400/10 bg-white/[0.02] px-4 sm:px-8 py-5 sm:py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-5 sm:gap-4">
              {STAT_STRIP.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex flex-col items-center text-center gap-1.5">
                    <Icon className="h-4 w-4 text-amber-400" />
                    <p className="text-xs sm:text-sm font-black text-white">{s.value}</p>
                    <p className="text-[9px] sm:text-[10px] text-neutral-500 leading-tight">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "exclusive" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Premium-exclusive titles</h2>
              <p className="text-xs text-neutral-500">Hand-picked by the Cinemax team, reserved for Premium members.</p>
            </div>
          </div>

          {exclusiveLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white/[0.03] border border-amber-400/5 animate-pulse">
                  <div className="aspect-[2/3] bg-white/5" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2.5 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : exclusiveTitles.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 space-y-3">
              <Lock className="h-8 w-8 mx-auto text-neutral-700" />
              <p className="text-sm">No Premium-exclusive titles are configured yet — check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {exclusiveTitles.map((movie) => (
                <PremiumMovieCard key={movie.id} movie={movie} quality="4K" onClick={() => onMovieClick(movie)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "gens" && <GensPage onMovieClick={onMovieClick} />}
    </div>
  );
};
