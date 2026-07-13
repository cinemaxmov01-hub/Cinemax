import React from "react";
import { Movie } from "../types";
import { Star, Play, Crown } from "lucide-react";
import { getImageUrl, isTvShow } from "../utils/tmdb";

interface PremiumMovieCardProps {
  movie: Movie;
  onClick: () => void;
  /** Small quality ribbon shown on the poster corner — purely cosmetic,
   *  mirrors the "4K" / "HD" tags used throughout the Premium hub imagery. */
  quality?: "4K" | "HD";
}

/**
 * Dedicated card for the Premium Hub only — intentionally NOT the shared
 * MovieCard used by the rest of the site, so the Premium interior can look
 * completely distinct (dark-gold frame, quality ribbon, gold rating chip)
 * without touching how cards render anywhere else in the app.
 */
export const PremiumMovieCard: React.FC<PremiumMovieCardProps> = ({ movie, onClick, quality = "4K" }) => {
  const isTv = isTvShow(movie);
  const titleText = movie.title || movie.name || "Untitled";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "0.0";
  const year = (movie.release_date || movie.first_air_date || "").slice(0, 4) || "N/A";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex-none w-[150px] sm:w-[180px] text-left cursor-pointer rounded-2xl overflow-hidden bg-[#0d0b06] border border-amber-400/10 hover:border-amber-400/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_-10px_rgba(251,191,36,0.35)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
        <img
          src={getImageUrl(movie.poster_path, "w500")}
          alt={titleText}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Rating chip */}
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/70 border border-amber-400/30 px-2 py-0.5">
          <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] font-bold text-amber-200">{rating}</span>
        </div>

        {/* Quality ribbon */}
        <div className="absolute top-2 right-0">
          <div className="flex items-center gap-1 rounded-l-full bg-gradient-to-r from-amber-400 to-yellow-500 pl-2.5 pr-2 py-0.5 shadow-sm">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-black">{quality}</span>
          </div>
        </div>

        {/* Hover overlay + play */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="rounded-full bg-gradient-to-br from-amber-300 to-amber-500 p-3 scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg shadow-amber-500/30">
            <Play className="h-4 w-4 fill-black text-black" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/90 to-transparent" />
      </div>

      <div className="p-2.5 space-y-1 border-t border-amber-400/10 bg-gradient-to-b from-[#0d0b06] to-[#0a0906]">
        <h4 className="text-xs font-bold text-neutral-100 truncate group-hover:text-amber-300 transition-colors">
          {titleText}
        </h4>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-medium">
          <Crown className="h-2.5 w-2.5 text-amber-500/70" fill="currentColor" />
          <span>{isTv ? "TV Show" : "Movie"}</span>
          <span className="text-neutral-700">•</span>
          <span>{year}</span>
        </div>
      </div>
    </button>
  );
};
