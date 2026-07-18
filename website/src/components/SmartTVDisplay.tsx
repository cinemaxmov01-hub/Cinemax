import React, { useState, useEffect, useRef } from "react";
import { Movie } from "../types";
import { getImageUrl } from "../utils/tmdb";
import { Play, Volume2, VolumeX } from "lucide-react";

interface SmartTVDisplayProps {
  shows: Movie[];
}

export const SmartTVDisplay: React.FC<SmartTVDisplayProps> = ({ shows }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentShow = shows[currentIndex] || shows[0];

  useEffect(() => {
    if (!shows.length) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % shows.length);
    }, 8000); // Change show every 8 seconds

    return () => clearInterval(interval);
  }, [shows.length]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  if (!currentShow) return null;

  const backdropUrl = getImageUrl(currentShow.backdrop_path, "original");
  const posterUrl = getImageUrl(currentShow.poster_path, "w500");

  return (
    <div className="smart-tv-container">
      <div className="smart-tv-frame">
        <div className="smart-tv-screen">
          {/* TV Screen Content */}
          <div className="tv-screen-content">
            <img
              src={backdropUrl || posterUrl}
              alt={currentShow.title || currentShow.name}
              className="tv-background"
            />
            <div className="tv-overlay">
              <div className="tv-show-info">
                <div className="tv-badge">TRENDING</div>
                <h3 className="tv-title">{currentShow.title || currentShow.name}</h3>
                <div className="tv-meta">
                  <span className="tv-year">
                    {currentShow.first_air_date?.split("-")[0] || "2024"}
                  </span>
                  <span className="tv-rating">
                    ⭐ {currentShow.vote_average?.toFixed(1)}
                  </span>
                </div>
              </div>
              <button className="tv-play-btn">
                <Play className="h-4 w-4" fill="currentColor" />
              </button>
            </div>
          </div>

          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className="tv-mute-btn"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </button>

          {/* Progress Indicator */}
          <div className="tv-progress">
            {shows.map((_, idx) => (
              <div
                key={idx}
                className={`tv-progress-dot ${idx === currentIndex ? "active" : ""}`}
              />
            ))}
          </div>
        </div>

        {/* TV Stand */}
        <div className="tv-stand">
          <div className="tv-stand-base" />
        </div>
      </div>
    </div>
  );
};
