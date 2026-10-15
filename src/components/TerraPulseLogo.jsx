/**
 * TerraPulseLogo — Unified Brand Vector Component
 *
 * Distinctive, original emblem representing agricultural intelligence:
 * - Circular deep-forest-green badge
 * - Stylized young plant / dual-leaf sprout emerging from curved agricultural field furrows
 * - Restrained palette: deep forest green, muted lime, sage, and warm ivory
 * - Accessible SVG with scalable viewBox
 */
export function TerraPulseLogo({
  variant = 'full', // 'full' (icon + wordmark + subtitle), 'icon' (emblem only), 'compact' (icon + wordmark)
  theme = 'dark',   // 'dark' (light text for dark/hero/nav backgrounds), 'light' (dark text for ivory pages)
  size = 38,        // emblem diameter in px
  showSubtitle = true,
  className = '',
}) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#FCFBF7' : '#14231A';
  const subColor = isDark ? '#A8C39B' : '#556B5B';
  const strokeBorder = isDark ? 'rgba(168, 195, 155, 0.35)' : 'rgba(30, 58, 41, 0.25)';

  const emblem = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TerraPulse Emblem"
      className="terrapulse-emblem-svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <title>TerraPulse Emblem</title>
      <defs>
        {/* Deep forest green circular background */}
        <linearGradient id="tp-emblem-bg" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#223E2E" />
          <stop offset="0.6" stopColor="#172B20" />
          <stop offset="1" stopColor="#0F1D15" />
        </linearGradient>

        {/* Sprout leaf gradient: muted lime into fresh spring green */}
        <linearGradient id="tp-leaf-grad-left" x1="15" y1="9" x2="20" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CBE6B4" />
          <stop offset="1" stopColor="#8EBC6E" />
        </linearGradient>

        <linearGradient id="tp-leaf-grad-right" x1="26" y1="12" x2="20" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A2CD80" />
          <stop offset="1" stopColor="#679A4B" />
        </linearGradient>

        {/* Pulse glow filter */}
        <radialGradient id="tp-inner-glow" cx="20" cy="20" r="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A8C39B" stopOpacity="0.18" />
          <stop offset="1" stopColor="#A8C39B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer circular badge */}
      <circle cx="20" cy="20" r="18.5" fill="url(#tp-emblem-bg)" stroke={strokeBorder} strokeWidth="1.2" />
      <circle cx="20" cy="20" r="18.5" fill="url(#tp-inner-glow)" />

      {/* Curved agricultural field furrows / topographic contour lines */}
      <path
        d="M6.5 25.5C10.5 22.8 15.2 21.8 20 21.8C24.8 21.8 29.5 22.8 33.5 25.5"
        stroke="#52785B"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M8.5 29.2C12 27.2 15.8 26.2 20 26.2C24.2 26.2 28 27.2 31.5 29.2"
        stroke="#759F7C"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12 33C14.5 31.6 17.2 30.8 20 30.8C22.8 30.8 25.5 31.6 28 33"
        stroke="#98BE9E"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Central plant sprout emerging from field lines */}
      {/* Central Stem */}
      <path
        d="M20 28V15"
        stroke="#EAF4E2"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Left Leaf: curved natural growth */}
      <path
        d="M20 18.5C17.2 16.5 13.8 16 11.8 17.2C11.2 17.6 11.2 18.5 11.8 18.9C14.5 20.8 17.8 20.5 20 20.2"
        fill="url(#tp-leaf-grad-left)"
        stroke="#2E4C36"
        strokeWidth="0.5"
      />

      {/* Right Leaf: reaching upward toward the sun */}
      <path
        d="M20 15.2C21.8 12.2 25.4 10.2 28.2 10.8C28.8 11 29 11.8 28.5 12.4C26.2 15 22.8 16.8 20 16.8"
        fill="url(#tp-leaf-grad-right)"
        stroke="#2E4C36"
        strokeWidth="0.5"
      />

      {/* Young emergent bud at tip */}
      <circle cx="20" cy="12.5" r="1.6" fill="#EAF4E2" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`terrapulse-logo-icon-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
        {emblem}
      </div>
    );
  }

  return (
    <div
      className={`terrapulse-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      {emblem}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span
          style={{
            fontFamily: "var(--font-display, 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif)",
            fontSize: size >= 36 ? '1.32rem' : '1.15rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: textColor,
            transition: 'color 0.2s ease',
          }}
        >
          TerraPulse
        </span>
        {showSubtitle && variant !== 'compact' && (
          <span
            style={{
              fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
              fontSize: '0.64rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: subColor,
              marginTop: '2px',
              transition: 'color 0.2s ease',
            }}
          >
            Agricultural Intelligence
          </span>
        )}
      </div>
    </div>
  );
}

export default TerraPulseLogo;
