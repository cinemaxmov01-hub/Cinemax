import React, { useState } from "react";
import { X, ArrowRight, Check, Sparkles } from "lucide-react";

interface CategorySelectionModalProps {
  isOpen: boolean;
  onComplete: (categories: string[]) => void;
}

const AVAILABLE_GENRES = [
  { id: "action", label: "Action", icon: "⚡" },
  { id: "comedy", label: "Comedy", icon: "😂" },
  { id: "drama", label: "Drama", icon: "🎭" },
  { id: "horror", label: "Horror", icon: "👻" },
  { id: "sci-fi", label: "Sci-Fi", icon: "🚀" },
  { id: "romance", label: "Romance", icon: "💕" },
  { id: "thriller", label: "Thriller", icon: "🔪" },
  { id: "animation", label: "Animation", icon: "🎨" },
  { id: "fantasy", label: "Fantasy", icon: "🧙" },
  { id: "documentary", label: "Documentary", icon: "📹" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "crime", label: "Crime", icon: "🔍" },
];

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({ isOpen, onComplete }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      if (prev.length >= 5) {
        setError("You can select up to 5 categories");
        return prev;
      }
      setError("");
      return [...prev, categoryId];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      setError("Please select at least 1 category");
      return;
    }
    onComplete(selectedCategories);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#39FF14]" />
            </div>
            <h2 className="text-lg font-bold text-white">Select Your Favorites</h2>
          </div>
        </div>

        <p className="text-sm text-neutral-400">
          Choose up to 5 movie categories you love. We'll use these to personalize your experience.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AVAILABLE_GENRES.map((genre) => {
            const isSelected = selectedCategories.includes(genre.id);
            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => toggleCategory(genre.id)}
                className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#39FF14] bg-[#39FF14]/10"
                    : "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#39FF14]/50"
                }`}
              >
                <div className="text-2xl mb-2">{genre.icon}</div>
                <div className="text-xs font-bold text-white">{genre.label}</div>
                {isSelected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#39FF14] flex items-center justify-center">
                    <Check className="h-3 w-3 text-black" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{selectedCategories.length}/5 selected</span>
        </div>

        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#39FF14] text-black font-bold text-sm hover:bg-[#31dd11] transition-colors cursor-pointer"
          >
            Complete Setup
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
