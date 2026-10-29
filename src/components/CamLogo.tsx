import React from 'react';

interface CamLogoProps {
  className?: string;
  variant?: 'dark' | 'light' | 'auto';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

export const CamLogo: React.FC<CamLogoProps> = ({
  className = '',
  variant = 'auto',
  showTagline = true,
  size = 'md',
  onClick,
}) => {
  // Size presets with mobile-first approach
  const sizeClasses = {
    sm: 'h-5 sm:h-8',
    md: 'h-6 sm:h-13 md:h-14',
    lg: 'h-8 sm:h-16',
    xl: 'h-12 sm:h-20',
  };

  const isDark = variant === 'dark';

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center select-none cursor-pointer transition-transform duration-200 active:scale-95 ${className}`}
      title="CamGo - Explore the Highlands"
    >
      <div className={`flex items-center gap-1.5 sm:gap-2.5 ${sizeClasses[size]}`}>
        {/* SVG Mountains Logo Icon matching camlogo_clean.png */}
        <svg
          viewBox="0 0 160 110"
          className="h-full w-auto drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Peak - Forest Green background & faceted mountain */}
          <path
            d="M52 10 L84 75 L18 75 Z"
            fill="#1F5C25"
          />
          {/* Left Peak Left Shade */}
          <path
            d="M52 10 L18 75 L38 75 Z"
            fill="#17451C"
          />
          {/* Left Peak Right Highlight */}
          <path
            d="M52 10 L84 75 L56 75 Z"
            fill="#2D8235"
          />

          {/* Center-Right Peak - Charcoal/Dark Slate */}
          <path
            d="M96 22 L132 88 L62 88 Z"
            fill="#262626"
          />
          <path
            d="M96 22 L62 88 L85 88 Z"
            fill="#1C1C1C"
          />
          <path
            d="M96 22 L132 88 L105 88 Z"
            fill="#3B3B3B"
          />

          {/* Far Left Green Ridge Facet */}
          <path
            d="M26 45 L5 88 L52 88 Z"
            fill="#246A2B"
          />
          <path
            d="M26 45 L5 88 L22 88 Z"
            fill="#15421A"
          />

          {/* Far Right Green Peak */}
          <path
            d="M102 38 L142 88 L82 88 Z"
            fill="#1F5C25"
          />
          <path
            d="M102 38 L142 88 L116 88 Z"
            fill="#2D8235"
          />

          {/* Crisp White Highland Ridge / Snowline Cutouts as in camlogo_clean.png */}
          <path
            d="M18 70 L34 46 L46 62 L64 26 L80 58 L98 32 L116 68 L130 52 L142 78"
            stroke="#FFFFFF"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="miter"
            fill="none"
          />
          {/* Dynamic white accent facets */}
          <polygon
            points="64,28 72,48 58,48"
            fill="#FFFFFF"
            opacity="0.95"
          />
          <polygon
            points="98,34 104,50 92,50"
            fill="#FFFFFF"
            opacity="0.95"
          />
        </svg>

        {/* CamGo Bold Wordmark */}
        <div className="flex items-baseline font-black tracking-tight leading-none">
          <span
            className={`text-base sm:text-3xl md:text-3.5xl font-heading font-extrabold transition-colors ${
              isDark ? 'text-stone-900' : 'text-white'
            }`}
          >
            Cam
          </span>
          <span className="text-base sm:text-3xl md:text-3.5xl font-heading font-extrabold text-emerald-400">
            Go
          </span>
        </div>
      </div>

      {showTagline && (
        <span
          className={`text-[7px] sm:text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase mt-0.5 ${
            isDark ? 'text-stone-700' : 'text-white drop-shadow-sm'
          }`}
        >
          EXPLORE THE HIGHLANDS
        </span>
      )}
    </div>
  );
};
