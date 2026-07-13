import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Home,
  Film,
  Tv,
  Clapperboard,
  ListPlus,
  Bookmark,
  History,
  Heart,
  Download,
  Settings,
  HelpCircle,
  Info,
  Menu,
  ChevronDown,
  LogOut,
  Lock,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { AvatarRenderer } from "./AnimatedAvatar";
import { APP_LANGUAGES } from "../i18n/translations";
import { AdBanner } from "./AdBanner";
import { fetchPublicAds, PublicAd } from "../utils/siteConfig";
import { CinemaxLogo } from "./CinemaxLogo";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { 
    currentView, 
    setCurrentView, 
    activeGenre, 
    setActiveGenre, 
    setActiveGenreName,
    user,
    isGuest,
    requireSignInPrompt,
    logoutUser,
    openAuthModal,
    theme,
    toggleTheme,
    t,
    appLanguage,
    setAppLanguage,
    siteConfig,
  } = useApp();

  const [sidebarAds, setSidebarAds] = useState<PublicAd[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  // Collapsed (icons-only) by default; expands to show icons + labels on
  // hover/touch, or whenever the mobile drawer is pulled open.
  const expanded = isExpanded || isOpen;

  useEffect(() => {
    fetchPublicAds().then((ads) => setSidebarAds(ads.filter((a) => a.placement === "sidebar")));
  }, []);

  const pageConfig = siteConfig.contentPages || {};

  // Guests are only allowed to browse Home, TV Show, Categories, About,
  // Help, and Language — every other primary view is locked and prompts a
  // sign-in instead.
  const GUEST_LOCKED_VIEWS = new Set([
    "movies",
    "shorts",
    "mylist",
    "watchlist",
    "history",
    "favorites",
    "downloads",
    "gens",
    "premium",
    "profile",
  ]);

  const primaryNavigation = [
    { id: "home", labelKey: "home", icon: Home },
    { id: "movies", labelKey: "movies", icon: Film },
    { id: "tv", labelKey: "tvShows", icon: Tv },
    { id: "shorts", labelKey: "shorts", icon: Clapperboard, badge: "NEW" },
    { id: "mylist", labelKey: "myList", icon: ListPlus },
    { id: "watchlist", labelKey: "watchlist", icon: Bookmark },
    { id: "history", labelKey: "history", icon: History },
    { id: "favorites", labelKey: "favorites", icon: Heart },
    { id: "downloads", labelKey: "downloads", icon: Download },
  ];

  const visiblePrimaryNav = primaryNavigation.filter((item) => {
    const cfg = pageConfig[item.id];
    return cfg ? cfg.enabled !== false : true;
  });

  const genres = [
    { id: "trending", labelKey: "genre.Trending" },
    { id: "popular", labelKey: "genre.Popular" },
    { id: "top_rated", labelKey: "genre.Top Rated" },
    { id: "upcoming", labelKey: "genre.Upcoming" },
    { id: "now_playing", labelKey: "genre.Now Playing" },
    { id: 28, labelKey: "genre.Action" },
    { id: 12, labelKey: "genre.Adventure" },
    { id: 16, labelKey: "genre.Animation" },
    { id: 35, labelKey: "genre.Comedy" },
    { id: 80, labelKey: "genre.Crime" },
    { id: 99, labelKey: "genre.Documentary" },
    { id: 18, labelKey: "genre.Drama" },
    { id: 10751, labelKey: "genre.Family" },
    { id: 14, labelKey: "genre.Fantasy" },
    { id: 36, labelKey: "genre.History" },
    { id: 27, labelKey: "genre.Horror" },
    { id: 10402, labelKey: "genre.Music" },
    { id: 9648, labelKey: "genre.Mystery" },
    { id: 10749, labelKey: "genre.Romance" },
    { id: 878, labelKey: "genre.Sci-Fi" },
    { id: 53, labelKey: "genre.Thriller" },
    { id: 10752, labelKey: "genre.War" },
    { id: 37, labelKey: "genre.Western" },
    { id: "superhero", labelKey: "genre.Superhero" },
    { id: "anime", labelKey: "genre.Anime" },
    { id: "kids", labelKey: "genre.Kids" },
    { id: "classic", labelKey: "genre.Classic" },
    { id: "award", labelKey: "genre.Award Winners" },
    { id: "latest", labelKey: "genre.Latest Releases" },
  ];

  const handleNavClick = (viewId: string) => {
    if (isGuest && GUEST_LOCKED_VIEWS.has(viewId)) {
      requireSignInPrompt();
      setIsOpen(false);
      return;
    }
    setActiveGenre(null);
    setActiveGenreName(null);
    setCurrentView(viewId);
  };

  const handleGenreClick = (genreId: number | string, label: string) => {
    setActiveGenre(genreId);
    setActiveGenreName(label);
    setCurrentView("movies");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          id="mobile-backdrop"
          className="fixed inset-0 z-40 bg-black lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-neutral-800 surface-panel text-neutral-400 transition-all duration-150 ease-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${expanded ? "w-64" : "w-20"}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onTouchStart={() => setIsExpanded(true)}
        onTouchEnd={() => setIsExpanded(false)}
      >
        {/* Logo Section */}
        <div id="logo-section" className={`flex h-20 items-center border-b border-white/5 transition-all duration-150 ${expanded ? "justify-between px-6" : "justify-center px-2"}`}>
          <div 
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => handleNavClick("home")}
          >
            <CinemaxLogo compact />
          </div>
          <button 
            id="close-sidebar-btn"
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Lists */}
        <div id="nav-scroll-area" className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          {/* Main Views */}
          <div id="primary-nav-group" className="space-y-1">
            {visiblePrimaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id && activeGenre === null;
              const navLabel = pageConfig[item.id]?.label || t(item.labelKey);
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    handleNavClick(item.id);
                    setIsOpen(false);
                  }}
                  title={!expanded ? navLabel : undefined}
                  className={`flex w-full items-center py-3 rounded-r-xl rounded-l-none font-sans text-sm font-medium transition-all duration-150 group -ml-4 border-l-2 ${
                    expanded ? "gap-4 px-4 pl-8" : "gap-0 justify-center pl-4 pr-0"
                  } ${
                    isActive 
                      ? "bg-gradient-to-r from-[rgba(57,255,20,0.1)] to-transparent text-[#39FF14] border-l-[#39FF14] border-y-transparent border-r-transparent" 
                      : "hover:bg-white/5 hover:text-white border-l-transparent border-y-transparent border-r-transparent"
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? "text-[#39FF14]" : "text-neutral-500 group-hover:text-white"
                  }`} />
                  <span className={`overflow-hidden whitespace-nowrap transition-all duration-150 ${
                    expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"
                  }`}>
                    {navLabel}
                  </span>
                  {expanded && isGuest && GUEST_LOCKED_VIEWS.has(item.id) && (
                    <Lock className="h-3.5 w-3.5 text-neutral-600 flex-shrink-0" />
                  )}
                  {expanded && item.badge && (
                    <span className="rounded bg-[#39FF14] px-1.5 py-0.5 text-[10px] font-extrabold text-black uppercase tracking-wider flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Categories — text-only list, so it only makes sense once the
              rail is expanded (no icon representation to show collapsed). */}
          <div id="categories-group" className={`space-y-3 overflow-hidden transition-all duration-150 ${expanded ? "opacity-100 max-h-[999px]" : "opacity-0 max-h-0"}`}>
            <div className="flex items-center justify-between px-4 text-xs font-bold tracking-wider text-neutral-500 uppercase">
              <span>{t("categories")}</span>
              <ChevronDown className="h-3 w-3" />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {genres.map((g) => {
                const isActive = activeGenre === g.id;
                return (
                  <button
                    key={g.id}
                    id={`genre-item-${g.id}`}
                    onClick={() => {
                      handleGenreClick(g.id, t(g.labelKey));
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2 text-sm rounded-lg transition-all duration-150 ${
                      isActive
                        ? "text-[#39FF14] font-semibold bg-white/5"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className={`mr-3 h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                      isActive ? "bg-[#39FF14] scale-125" : "bg-neutral-700"
                    }`} />
                    {t(g.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {sidebarAds.length > 0 && (
            <div className={`space-y-2 px-1 overflow-hidden transition-all duration-150 ${expanded ? "opacity-100 max-h-[999px]" : "opacity-0 max-h-0"}`}>
              {sidebarAds.map((ad) => (
                <AdBanner key={ad.id} ad={ad} variant="sidebar" />
              ))}
            </div>
          )}

          {/* Settings & Support */}
          <div id="support-group" className="space-y-1">
            <button
              id="nav-settings-btn"
              onClick={() => {
                handleNavClick("profile");
                setIsOpen(false);
              }}
              title={!expanded ? t("settings") : undefined}
              className={`flex w-full items-center py-2.5 text-sm rounded-lg hover:text-white hover:bg-white/5 transition-colors ${expanded ? "gap-4 px-4" : "gap-0 justify-center px-2"}`}
            >
              <Settings className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-150 ${expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"}`}>{t("settings")}</span>
              {expanded && isGuest && <Lock className="h-3.5 w-3.5 text-neutral-600 flex-shrink-0" />}
            </button>
            <button
              id="nav-support-btn"
              onClick={() => {
                setCurrentView("help");
                setIsOpen(false);
              }}
              title={!expanded ? t("helpDesk") : undefined}
              className={`flex w-full items-center py-2.5 text-sm rounded-lg hover:text-white hover:bg-white/5 transition-colors ${expanded ? "gap-4 px-4" : "gap-0 justify-center px-2"}`}
            >
              <HelpCircle className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-150 ${expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"}`}>{t("helpDesk")}</span>
            </button>
            <button
              id="nav-about-btn"
              onClick={() => {
                setCurrentView("about");
                setIsOpen(false);
              }}
              title={!expanded ? t("aboutCinemax") : undefined}
              className={`flex w-full items-center py-2.5 text-sm rounded-lg hover:text-white hover:bg-white/5 transition-colors ${expanded ? "gap-4 px-4" : "gap-0 justify-center px-2"}`}
            >
              <Info className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-150 ${expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"}`}>{t("aboutCinemax")}</span>
            </button>
            <button
              id="nav-theme-toggle-btn"
              onClick={toggleTheme}
              title="Toggle dark / light grey mode"
              className={`flex w-full items-center py-2.5 text-sm rounded-lg hover:text-white hover:bg-white/5 transition-colors ${expanded ? "gap-4 px-4" : "gap-0 justify-center px-2"}`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              ) : (
                <Moon className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              )}
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-150 ${expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"}`}>
                {theme === "dark" ? t("lightMode") : t("darkMode")}
              </span>
            </button>
            <div className={`flex w-full items-center py-2.5 text-sm rounded-lg overflow-hidden transition-all duration-150 ${expanded ? "gap-4 px-4 opacity-100 max-h-20" : "gap-0 justify-center px-2 opacity-0 max-h-0 pointer-events-none"}`}>
              <Globe className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <span className="flex-1 text-left text-neutral-400 whitespace-nowrap">{t("language")}</span>
              <select
                value={appLanguage}
                onChange={(e) => setAppLanguage(e.target.value as typeof appLanguage)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#39FF14]/40 cursor-pointer max-w-[110px]"
                aria-label={t("language")}
                tabIndex={expanded ? 0 : -1}
              >
                {APP_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* User Card Footer */}
        {user && (
          <div
            id="user-sidebar-footer"
            className={`border-t border-white/5 bg-black/40 p-4 flex items-center transition-all duration-150 ${expanded ? "gap-3" : "gap-0 justify-center"}`}
          >
            <button
              onClick={() => handleNavClick("profile")}
              className="relative group/avatar flex-shrink-0 cursor-pointer"
              title="Account Settings"
            >
              <div className="rounded-2xl overflow-hidden border border-neutral-800 group-hover/avatar:border-[#39FF14] transition-colors duration-300">
                <AvatarRenderer value={user.avatar} size={44} initials={user.name?.[0]?.toUpperCase() || "C"} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39FF14]"></span>
              </span>
            </button>
            <button
              onClick={() => handleNavClick("profile")}
              className={`min-w-0 text-left cursor-pointer overflow-hidden transition-all duration-150 ${expanded ? "flex-1 opacity-100 max-w-[160px]" : "flex-none opacity-0 max-w-0"}`}
              title="Account Settings"
            >
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-neutral-500 truncate">{user.email}</p>
            </button>
            {expanded && (
              <button
                id="sidebar-logout-btn"
                onClick={logoutUser}
                aria-label="Log out"
                title="Log out"
                className="flex-shrink-0 p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
