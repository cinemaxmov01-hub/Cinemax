import React, { useState } from "react";
import { X, ArrowRight, Calendar } from "lucide-react";

interface AgeInputModalProps {
  isOpen: boolean;
  onComplete: (age: number) => void;
}

export const AgeInputModal: React.FC<AgeInputModalProps> = ({ isOpen, onComplete }) => {
  const [age, setAge] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError("Please enter a valid age (1-120)");
      return;
    }
    
    if (ageNum < 13) {
      setError("You must be at least 13 years old to use this service");
      return;
    }
    
    onComplete(ageNum);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#39FF14]" />
            </div>
            <h2 className="text-lg font-bold text-white">Enter Your Age</h2>
          </div>
        </div>

        <p className="text-sm text-neutral-400">
          We need to know your age to provide personalized content and ensure appropriate access to certain features.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="age-input" className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Age
            </label>
            <input
              id="age-input"
              type="number"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setError("");
              }}
              placeholder="Enter your age"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#39FF14]/50 transition-colors"
              min="1"
              max="120"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#39FF14] text-black font-bold text-sm hover:bg-[#31dd11] transition-colors cursor-pointer"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
