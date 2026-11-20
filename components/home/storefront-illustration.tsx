/** Decorative storefront with striped awning, map pin and plants for the owner CTA banner. */
export function StorefrontIllustration({ className }: { className?: string }) {
  const stripes = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg viewBox="0 0 360 260" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="sf-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EFE4F7" />
        </linearGradient>
        <linearGradient id="sf-pin" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E9D3F7" />
        </linearGradient>
      </defs>
      {/* ground */}
      <ellipse cx="200" cy="238" rx="160" ry="14" fill="#000" opacity="0.18" />
      <rect x="60" y="222" width="290" height="14" rx="4" fill="#E9DDF4" />
      {/* building */}
      <rect x="92" y="96" width="232" height="128" rx="6" fill="url(#sf-wall)" />
      <rect x="84" y="40" width="248" height="22" rx="6" fill="#4A148C" />
      <rect x="96" y="58" width="224" height="40" fill="#5E1A9A" />
      {/* awning */}
      {stripes.map((i) => (
        <path key={i} d={`M${96 + i * 28} 62h28l6 40h-40Z`} fill={i % 2 ? "#FFFFFF" : "#8E24AA"} />
      ))}
      {stripes.map((i) => (
        <path key={`s${i}`} d={`M${90 + i * 28} 102a14 12 0 0 0 28 0Z`} fill={i % 2 ? "#F3E5FB" : "#7B1FA2"} />
      ))}
      {/* window */}
      <rect x="118" y="132" width="104" height="66" rx="4" fill="#4A148C" />
      <rect x="124" y="138" width="44" height="54" rx="2" fill="#6F7EE0" opacity="0.85" />
      <rect x="172" y="138" width="44" height="54" rx="2" fill="#6F7EE0" opacity="0.85" />
      <path d="M128 142l18 0-22 30Z" fill="#fff" opacity="0.35" />
      {/* door */}
      <rect x="244" y="128" width="56" height="96" rx="4" fill="#4A148C" />
      <rect x="252" y="138" width="40" height="76" rx="2" fill="#7B1FA2" />
      <circle cx="285" cy="178" r="3" fill="#F3E5FB" />
      {/* map pin */}
      <g>
        <path d="M44 96c-18 0-32 14-32 31 0 23 32 55 32 55s32-32 32-55c0-17-14-31-32-31Z" fill="url(#sf-pin)" />
        <circle cx="44" cy="127" r="12" fill="#7B1FA2" />
        <circle cx="44" cy="127" r="5" fill="#fff" />
      </g>
      {/* plants */}
      <rect x="92" y="204" width="20" height="20" rx="3" fill="#E9DDF4" />
      <path d="M102 206c-14-10-10-30 0-38 10 8 14 28 0 38Z" fill="#3FA34D" />
      <path d="M102 206c-4-14 6-22 14-22-1 10-6 18-14 22Z" fill="#5BC167" />
      <rect x="322" y="200" width="22" height="24" rx="3" fill="#E9DDF4" />
      <path d="M333 202c-16-12-12-36 0-46 12 10 16 34 0 46Z" fill="#3FA34D" />
      <path d="M333 202c-6-14 4-26 14-26-1 12-6 20-14 26Z" fill="#5BC167" />
    </svg>
  );
}
