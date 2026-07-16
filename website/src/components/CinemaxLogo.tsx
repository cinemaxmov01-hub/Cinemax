import React, { useState } from "react";

interface CinemaxLogoProps {
  className?: string;
  compact?: boolean;
}

export const CinemaxLogo: React.FC<CinemaxLogoProps> = ({ className = "", compact = false }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = compact ? "/branding/cinemax-logo-mark.svg" : "/branding/cinemax-stream-logo.svg";

  return (
    <div className={`flex items-center justify-center ${className}`.trim()}>
      <div className={compact ? "relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center overflow-visible rounded-xl bg-transparent" : "relative flex w-40 max-w-[60vw] sm:w-64 sm:max-w-[78vw] items-center justify-center overflow-visible bg-transparent"}>
        {!imgFailed && (
          <img
            src={imgSrc}
            alt="Cinemax"
            className={compact ? "h-9 w-9 sm:h-11 sm:w-11 object-contain" : "h-20 w-auto sm:h-auto sm:w-full object-contain"}
            onError={() => setImgFailed(true)}
          />
        )}

        {imgFailed && (
          <svg viewBox="0 0 120 120" className={compact ? "relative h-9 w-9 sm:h-11 sm:w-11" : "relative h-20 w-20 sm:h-28 sm:w-28"} aria-hidden="true">
            <circle cx="60" cy="60" r="34" fill="none" stroke="#052009" strokeWidth="10" />
            <path
              d="M88 60a28 28 0 1 1-28-28"
              fill="none"
              stroke="#39FF14"
              strokeWidth="18"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
