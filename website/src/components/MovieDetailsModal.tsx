import React, { useEffect, useState } from "react";
import { Movie } from "../types";
import { getImageUrl, tmdb } from "../utils/tmdb";
import { X, Play, Star, Clock, Calendar, Info, Plus, Film, Heart, Share2, Award, TrendingUp, Users, Instagram, Facebook, MessageCircle, Copy } from "lucide-react";

interface MovieDetailsModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (movie: Movie) => void;
  onWatchTrailer?: (movie: Movie) => void;
  onAddToWatchlist?: (movie: Movie) => void;
}

/**
 * A beautifully redesigned full-detail view of a single title with modern UI
 * featuring enhanced visual hierarchy, better information architecture, and
 * stunning design elements for an exceptional user experience.
 */
export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ movie, isOpen, onClose, onPlay, onWatchTrailer, onAddToWatchlist }) => {
  const [details, setDetails] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [socialMediaLinks, setSocialMediaLinks] = useState<Array<{ id: string; platform: string; name: string; url: string; icon: string; enabled: boolean }>>([]);

  useEffect(() => {
    // Fetch social media links from backend
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.socialMediaLinks) {
          setSocialMediaLinks(data.settings.socialMediaLinks.filter((link: any) => link.enabled));
        }
      })
      .catch(err => console.error('Failed to fetch social media links:', err));
  }, []);

  const handleShare = (platform: string, url: string) => {
    const currentUrl = window.location.href;
    const title = movie?.title || movie?.name || '';
    let shareUrl = '';

    switch (platform) {
      case 'instagram':
        // Instagram doesn't support direct URL sharing, open the app
        window.open('instagram://', '_blank');
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} - ${currentUrl}`)}`;
        window.open(shareUrl, '_blank');
        break;
      default:
        // For custom platforms, use the provided URL if available
        if (url) {
          shareUrl = url.replace('{url}', encodeURIComponent(currentUrl)).replace('{title}', encodeURIComponent(title));
          window.open(shareUrl, '_blank');
        }
        break;
    }
    setShowShareDropdown(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  useEffect(() => {
    if (!movie) return;
    setDetails(movie);
    setImageLoaded(false);
    if (movie.isCustom) return; // Admin-authored content has no TMDB id to deepen

    const needsMore = !movie.genres || !movie.runtime;
    if (!needsMore) return;

    setLoading(true);
    const isTv = !movie.title;
    const fetchPromise = isTv ? tmdb.getTVDetails(movie.id) : tmdb.getMovieDetails(movie.id);
    fetchPromise
      .then((data) => setDetails(data))
      .catch((err) => console.error("Failed to load full movie details", err))
      .finally(() => setLoading(false));
  }, [movie]);

  if (!isOpen || !movie) return null;

  const d = details || movie;
  const isTv = !d.title;
  const runtimeText = d.runtime
    ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
    : d.episode_run_time && d.episode_run_time.length > 0
    ? `${d.episode_run_time[0]}m per episode`
    : null;
  const yearText = (d.release_date || d.first_air_date || "").slice(0, 4);
  const ageRating = d.adult ? "R" : d.vote_average >= 8 ? "PG-13" : "PG";
  const ratingPercent = d.vote_average ? Math.round(d.vote_average * 10) : 0;

  return (
    <div
      id="movie-details-backdrop"
      className="fixed inset-0 z-55 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-4 md:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="movie-details-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] text-white shadow-2xl shadow-black/60 border border-[#39FF14]/20 animate-slide-up"
      >
        {/* Cinematic Backdrop with Gradient Overlay */}
        <div className="relative w-full aspect-[21/9] sm:aspect-[21/9] overflow-hidden rounded-t-2xl sm:rounded-t-3xl">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] animate-pulse" />
          )}
          <img
            src={getImageUrl(d.backdrop_path || d.poster_path, "original")}
            alt={d.title || d.name}
            className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a] via-[#0f0f1a]/70 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f1a]/90 via-[#0f0f1a]/40 to-transparent" />
          
          {/* Close Button */}
          <button
            id="close-details-modal-btn"
            onClick={onClose}
            className="absolute right-4 top-4 z-30 rounded-full bg-black/40 backdrop-blur-md p-2.5 text-white/80 hover:bg-black/60 hover:text-white transition-all cursor-pointer border border-white/10 hover:border-white/20 group"
          >
            <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-1">
                <h2 className="font-sans text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white mb-1 sm:mb-2 drop-shadow-lg">
                  {d.title || d.name}
                </h2>
                <p className="text-xs sm:text-sm text-white/70 font-medium">
                  {isTv ? "TV Series" : "Movie"} • {yearText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Body Content */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* Stats Row - Modern Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Rating Card */}
            <div className="bg-gradient-to-br from-[#39FF14]/10 to-[#39FF14]/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#39FF14]/30 hover:border-[#39FF14]/60 transition-all group shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:shadow-[0_0_25px_rgba(57,255,20,0.2)]">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-[#39FF14] fill-[#39FF14]" />
                <span className="text-[10px] sm:text-xs text-[#39FF14] font-semibold">Rating</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{d.vote_average?.toFixed(1) || "N/A"}</div>
              <div className="text-[9px] sm:text-[10px] text-[#39FF14]/70 mt-0.5 sm:mt-1">TMDB Score</div>
            </div>

            {/* Runtime Card */}
            {runtimeText && (
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-400/30 hover:border-blue-400/60 transition-all group shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)]">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                  <span className="text-[10px] sm:text-xs text-blue-400 font-semibold">Duration</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-white">{runtimeText}</div>
                <div className="text-[9px] sm:text-[10px] text-blue-400/70 mt-0.5 sm:mt-1">{isTv ? "Per Episode" : "Total"}</div>
              </div>
            )}

            {/* Year Card */}
            {yearText && (
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-purple-400/30 hover:border-purple-400/60 transition-all group shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                  <span className="text-[10px] sm:text-xs text-purple-400 font-semibold">Release</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">{yearText}</div>
                <div className="text-[9px] sm:text-[10px] text-purple-400/70 mt-0.5 sm:mt-1">{isTv ? "First Aired" : "Released"}</div>
              </div>
            )}

            {/* Age Rating Card */}
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-orange-400/30 hover:border-orange-400/60 transition-all group shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:shadow-[0_0_25px_rgba(249,115,22,0.2)]">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Award className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
                <span className="text-[10px] sm:text-xs text-orange-400 font-semibold">Rating</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{ageRating}</div>
              <div className="text-[9px] sm:text-[10px] text-orange-400/70 mt-0.5 sm:mt-1">Age Guidance</div>
            </div>
          </div>

          {/* Genres - Enhanced Pills */}
          {d.genres && d.genres.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-[#39FF14] uppercase tracking-wider">Genres</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {d.genres.slice(0, 6).map((g, index) => (
                  <span
                    key={g.id}
                    className="relative px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#39FF14]/20 to-[#39FF14]/5 border border-[#39FF14]/40 text-[10px] sm:text-sm font-semibold text-white hover:border-[#39FF14] hover:from-[#39FF14]/30 hover:to-[#39FF14]/10 transition-all cursor-default shadow-[0_0_10px_rgba(57,255,20,0.1)] hover:shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Overview - Enhanced Typography */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-[#39FF14] uppercase tracking-wider">Synopsis</h3>
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-[#39FF14]/20 shadow-[0_0_15px_rgba(57,255,20,0.05)]">
              <p className="text-xs sm:text-sm sm:text-base text-neutral-200 leading-relaxed">
                {d.overview || "No synopsis available for this title yet."}
              </p>
              <div className="absolute top-3 right-3 opacity-30">
                <Info className="h-5 w-5 sm:h-6 sm:w-6 text-[#39FF14]" />
              </div>
            </div>
          </div>

          {/* Additional Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Trailer Section */}
            {onWatchTrailer && (
              <button
                onClick={() => onWatchTrailer(d)}
                className="relative group rounded-2xl bg-gradient-to-br from-[#39FF14]/10 to-[#39FF14]/5 border border-[#39FF14]/20 overflow-hidden cursor-pointer hover:border-[#39FF14]/40 transition-all"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#39FF14]/20 blur-xl rounded-full group-hover:bg-[#39FF14]/30 transition-all" />
                    <div className="relative h-16 w-16 rounded-full bg-[#39FF14]/20 border-2 border-[#39FF14]/40 flex items-center justify-center group-hover:bg-[#39FF14]/30 group-hover:scale-110 transition-all">
                      <Play className="h-7 w-7 text-[#39FF14] fill-[#39FF14]" />
                    </div>
                  </div>
                </div>
                <div className="p-6 text-center relative z-10">
                  <p className="text-sm font-bold text-white mb-1">Watch Trailer</p>
                  <p className="text-xs text-neutral-400">Official preview</p>
                </div>
              </button>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all group">
                <Heart className="h-5 w-5 text-neutral-400 group-hover:text-red-400 group-hover:fill-red-400 transition-all" />
                <span className="text-xs font-medium text-neutral-300">Favorite</span>
              </button>
              <button 
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all group relative"
              >
                <Share2 className="h-5 w-5 text-neutral-400 group-hover:text-blue-400 transition-all" />
                <span className="text-xs font-medium text-neutral-300">Share</span>
                
                {/* Share Dropdown */}
                {showShareDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1a2e] border border-white/10 rounded-xl p-3 shadow-2xl z-50">
                    <div className="flex flex-col gap-2">
                      {socialMediaLinks.length > 0 ? (
                        socialMediaLinks.map((link) => (
                          <button
                            key={link.id}
                            onClick={() => handleShare(link.platform, link.url)}
                            className={`flex items-center justify-center gap-2 text-white p-3 rounded-xl transition-all ${
                              link.platform === 'instagram' 
                                ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 hover:opacity-90'
                                : link.platform === 'facebook'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : link.platform === 'whatsapp'
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-white/10 hover:bg-white/20 border border-white/10'
                            }`}
                          >
                            {link.platform === 'instagram' && <Instagram className="h-5 w-5" />}
                            {link.platform === 'facebook' && <Facebook className="h-5 w-5" />}
                            {link.platform === 'whatsapp' && <MessageCircle className="h-5 w-5" />}
                            <span className="text-xs font-semibold">{link.name}</span>
                          </button>
                        ))
                      ) : (
                        <>
                          <button
                            onClick={() => handleShare('instagram', '')}
                            className="flex items-center justify-center gap-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white p-3 rounded-xl hover:opacity-90 transition-all"
                          >
                            <Instagram className="h-5 w-5" />
                            <span className="text-xs font-semibold">Instagram</span>
                          </button>
                          <button
                            onClick={() => handleShare('facebook', '')}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all"
                          >
                            <Facebook className="h-5 w-5" />
                            <span className="text-xs font-semibold">Facebook</span>
                          </button>
                          <button
                            onClick={() => handleShare('whatsapp', '')}
                            className="flex items-center justify-center gap-2 bg-green-500 text-white p-3 rounded-xl hover:bg-green-600 transition-all"
                          >
                            <MessageCircle className="h-5 w-5" />
                            <span className="text-xs font-semibold">WhatsApp</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white p-3 rounded-xl transition-all"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="text-xs font-semibold">{copySuccess ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4 pt-3 sm:pt-4">
            <button
              id="details-modal-play-btn"
              onClick={() => onPlay(d)}
              className="flex-1 flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-[#39FF14] to-[#31dd11] hover:from-[#31dd11] hover:to-[#2bc20f] text-black font-extrabold px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:shadow-[0_0_40px_rgba(57,255,20,0.4)] transition-all cursor-pointer text-xs sm:text-sm sm:text-base transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-black" />
              <span>Play Now</span>
            </button>
            {onAddToWatchlist && (
              <button
                onClick={() => onAddToWatchlist(d)}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-xs sm:text-sm sm:text-base hover:border-white/30"
                title="Add to Watchlist"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Watchlist</span>
              </button>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="h-2 w-2 bg-[#39FF14] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 bg-[#39FF14] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 bg-[#39FF14] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-[#39FF14] font-medium ml-2">Loading additional details...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
