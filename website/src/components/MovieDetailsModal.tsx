import React, { useEffect, useState } from "react";
import { Movie } from "../types";
import { getImageUrl, tmdb } from "../utils/tmdb";
import { X, Play, Star, Clock, Calendar, Info, Heart, Plus, Film, Users, Award } from "lucide-react";

interface MovieDetailsModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (movie: Movie) => void;
}

/**
 * A full-detail view of a single title — everything the Hero's "More Info"
 * button promises, distinct from "Play Now" which jumps straight into
 * playback. Fetches the deeper TMDB record (full overview, genres, runtime)
 * whenever the summary data on hand looks incomplete.
 */
export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ movie, isOpen, onClose, onPlay }) => {
  const [details, setDetails] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);
  const [cast, setCast] = useState<any[]>([]);
  const [director, setDirector] = useState<string>("");
  const [trailerKey, setTrailerKey] = useState<string>("");
  const [imdbRating, setImdbRating] = useState<string>("");
  const [rottenTomatoes, setRottenTomatoes] = useState<string>("");

  useEffect(() => {
    if (!movie) return;
    setDetails(movie);
    if (movie.isCustom) return; // Admin-authored content has no TMDB id to deepen

    const needsMore = !movie.genres || !movie.runtime;
    setLoading(true);
    const isTv = !movie.title;
    
    // Fetch main details
    const fetchPromise = isTv ? tmdb.getTVDetails(movie.id) : tmdb.getMovieDetails(movie.id);
    
    // Fetch cast and crew
    const creditsPromise = isTv ? tmdb.getTVCredits(movie.id) : tmdb.getMovieCredits(movie.id);
    
    // Fetch videos for trailer
    const videosPromise = isTv ? tmdb.getTVVideos(movie.id) : tmdb.getMovieVideos(movie.id);

    Promise.all([fetchPromise, creditsPromise, videosPromise])
      .then(([data, creditsData, videosData]) => {
        setDetails(data);
        
        // Extract cast (top 4) - creditsData is CastMember[] directly
        if (Array.isArray(creditsData)) {
          setCast(creditsData.slice(0, 4).map((c: any) => c.name));
        }
        
        // For director, fetch full credits directly from TMDB
        const apiKey = "8e887749d8a5b7a31b807aadd903d25a";
        const baseUrl = "https://api.themoviedb.org/3";
        const creditsUrl = isTv 
          ? `${baseUrl}/tv/${movie.id}/credits?api_key=${apiKey}`
          : `${baseUrl}/movie/${movie.id}/credits?api_key=${apiKey}`;
        
        fetch(creditsUrl)
          .then(res => res.json())
          .then((fullCredits: any) => {
            if (fullCredits?.crew) {
              const dir = fullCredits.crew.find((c: any) => c.job === "Director");
              setDirector(dir ? dir.name : "");
            }
          })
          .catch(() => {
            setDirector("");
          });
        
        // Extract trailer key
        if (videosData && videosData.length > 0) {
          setTrailerKey(videosData[0].key);
        }
        
        // Set IMDb rating from vote_average (TMDB doesn't provide separate IMDb ratings)
        if (data.vote_average) {
          setImdbRating(data.vote_average.toFixed(1));
        }
        
        // Rotten Tomatoes would need external API, using placeholder
        setRottenTomatoes("N/A");
      })
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
  const fullDateText = d.release_date || d.first_air_date || "";
  
  // Generate star rating display
  const starRating = d.vote_average ? Math.round(d.vote_average / 2) : 0;
  const stars = Array(5).fill(0).map((_, i) => i < starRating);

  return (
    <div
      id="movie-details-backdrop"
      className="fixed inset-0 z-55 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="movie-details-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-3xl h-[70vh] sm:max-h-[88vh] sm:h-auto overflow-y-auto no-scrollbar rounded-t-3xl sm:rounded-3xl border border-white/10 glass-card bg-[#0a0a0a]/98 text-white shadow-2xl shadow-black/80 animate-fade-in"
      >
        {/* Backdrop image header */}
        <div className="relative w-full aspect-video overflow-hidden">
          <img
            src={getImageUrl(d.backdrop_path || d.poster_path, "original")}
            alt={d.title || d.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
          <button
            id="close-details-modal-btn"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2 text-neutral-300 hover:bg-black/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#39FF14]/15 border border-[#39FF14]/30 px-2 py-0.5 text-[10px] font-bold text-[#39FF14] uppercase tracking-widest mb-3">
              <Info className="h-3 w-3" /> {isTv ? "TV Show" : "Movie"} Details
            </span>
            <h2 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-white">
              {d.title || d.name}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Synopsis Section */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#39FF14] mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              Synopsis
            </h3>
            <p className="text-sm text-neutral-200 leading-relaxed font-medium">
              {d.overview || "No synopsis available for this title yet."}
            </p>
          </div>

          {/* Quick Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Clock className="h-3 w-3" />
                Runtime
              </div>
              <div className="text-white text-sm font-semibold">
                {runtimeText || "N/A"}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Film className="h-3 w-3" />
                Genre
              </div>
              <div className="text-white text-sm font-semibold truncate">
                {d.genres && d.genres.length > 0 ? d.genres[0].name : "N/A"}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Calendar className="h-3 w-3" />
                Release
              </div>
              <div className="text-white text-sm font-semibold">
                {yearText || "N/A"}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Award className="h-3 w-3" />
                Rating
              </div>
              <div className="text-white text-sm font-semibold">
                {d.vote_average ? "PG-13" : "N/A"}
              </div>
            </div>
          </div>

          {/* Genres */}
          {d.genres && d.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {d.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full border border-[#39FF14]/30 bg-[#39FF14]/10 px-3 py-1 text-[11px] font-semibold text-[#39FF14]"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Ratings & Reviews */}
          <div className="bg-gradient-to-r from-white/5 to-transparent rounded-xl p-4 border border-white/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
              <Star className="h-3.5 w-3.5" />
              Ratings & Reviews
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {/* IMDb */}
              <div className="text-center">
                <div className="text-2xl font-black text-amber-400">{imdbRating}</div>
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">IMDb</div>
              </div>
              {/* Rotten Tomatoes */}
              <div className="text-center">
                <div className="text-2xl font-black text-red-400">{rottenTomatoes}</div>
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Rotten Tomatoes</div>
              </div>
              {/* In-App Rating */}
              <div className="text-center">
                <div className="flex justify-center gap-0.5 mb-1">
                  {stars.map((filled, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${filled ? 'text-[#39FF14] fill-[#39FF14]' : 'text-neutral-600'}`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Cinemax Rating</div>
              </div>
            </div>
          </div>

          {/* Cast & Crew */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Cast & Crew
            </h3>
            <div className="space-y-3">
              {cast.length > 0 && (
                <div>
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Lead Cast</div>
                  <div className="text-sm text-neutral-200">
                    {cast.join(", ")}
                  </div>
                </div>
              )}
              {director && (
                <div>
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Director</div>
                  <div className="text-sm text-neutral-200">
                    {director}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 pt-4 border-t border-white/10">
            <button
              id="details-modal-play-btn"
              onClick={() => onPlay(d)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#39FF14] hover:bg-[#31dd11] text-black font-extrabold px-6 py-3 sm:py-3 h-12 sm:h-auto rounded-2xl transition-all cursor-pointer min-h-[44px]"
            >
              <Play className="h-5 w-5 fill-black" />
              <span>Watch Now</span>
            </button>
            <button
              onClick={() => {
                // Add to watchlist functionality
                if (typeof window !== 'undefined' && (window as any).__cinemaxAddToWatchlist) {
                  (window as any).__cinemaxAddToWatchlist(d.id);
                }
              }}
              className="w-12 h-12 sm:w-auto sm:h-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-4 py-3 sm:px-4 sm:py-3 rounded-2xl transition-all cursor-pointer min-w-[44px] min-h-[44px]"
              title="Add to Watchlist"
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white font-semibold px-6 py-3 sm:py-3 h-12 sm:h-auto rounded-2xl transition-all cursor-pointer min-h-[44px]"
            >
              Close
            </button>
          </div>
          
          {loading && (
            <div className="text-center text-[10px] text-[#39FF14] animate-pulse font-semibold uppercase tracking-wider">
              Loading full details…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
