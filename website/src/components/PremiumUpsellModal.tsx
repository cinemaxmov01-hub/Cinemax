import React from "react";
import { Movie } from "../types";
import { X, Crown, Check } from "lucide-react";
import { getImageUrl } from "../utils/tmdb";

interface PremiumUpsellModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

const PERKS = ["4K Ultra HD & HDR", "Zero ads", "Exclusive Premium titles", "Offline downloads"];

// Shown when a signed-in but non-Premium user tries to open a title the
// admin has flagged as Premium-exclusive (see site_settings.premiumOnlyMovieIds
// and site_settings.premiumFeatureEnabled, both fully admin-controlled from
// the Premium Access panel). This never gates guests specifically — the
// normal sign-in prompt already covers that case first.
export const PremiumUpsellModal: React.FC<PremiumUpsellModalProps> = ({ movie, isOpen, onClose }) => {
  if (!isOpen || !movie) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/10 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-32 w-full">
          {(movie.backdrop_path || movie.poster_path) && (
            <img
              src={getImageUrl(movie.backdrop_path || movie.poster_path, "w780")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-5 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
              <Crown className="h-4 w-4 text-black" fill="currentColor" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Premium Exclusive</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">"{movie.title || movie.name}" is Premium-only</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Upgrade your plan to unlock this title, plus everything else Premium members get.
            </p>
          </div>

          <ul className="space-y-2">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-xs text-neutral-300">
                <Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-xs uppercase tracking-wide py-3 hover:brightness-110 transition-all cursor-pointer"
            >
              View Premium Plans
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 text-neutral-400 text-xs font-bold uppercase tracking-wide py-3 px-4 hover:bg-white/5 cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
