/**
 * Flat illustration for the sign-in page: a faculty member at a desk,
 * signing in to the portal, with a bookshelf, a plant and the campus
 * skyline through the window. Drawn for this portal; pure SVG.
 */
export function DeskIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 420" role="img" aria-label="A faculty member signing in to the portal at a desk" className={className}>
      {/* campus skyline */}
      <g fill="#e3eaf3">
        <rect x="20" y="120" width="44" height="170" />
        <rect x="70" y="80" width="56" height="210" />
        <rect x="132" y="140" width="40" height="150" />
        <rect x="380" y="100" width="50" height="190" />
        <rect x="436" y="140" width="62" height="150" />
        <path d="M70 80 L98 56 L126 80 Z" />
      </g>
      <g fill="#f3f6fa">
        {[0, 1, 2, 3, 4, 5].map((r) =>
          [0, 1].map((c) => <rect key={`${r}-${c}`} x={80 + c * 22} y={96 + r * 28} width="12" height="16" rx="1" />),
        )}
      </g>

      {/* wall clock */}
      <circle cx="300" cy="62" r="18" fill="#ffffff" stroke="#cfd9e6" strokeWidth="3" />
      <path d="M300 62 L300 51 M300 62 L308 66" stroke="#23263f" strokeWidth="2.5" strokeLinecap="round" />

      {/* screen-sized login card on the wall behind the desk */}
      <rect x="250" y="110" width="170" height="110" rx="6" fill="#b9d3ea" />
      <rect x="292" y="126" width="86" height="12" rx="3" fill="#ffffff" />
      <rect x="292" y="146" width="86" height="12" rx="3" fill="#ffffff" />
      <rect x="292" y="168" width="86" height="12" rx="3" fill="#1f5d86" />
      <text x="335" y="177" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ffffff">Login</text>

      {/* speech bubble */}
      <rect x="168" y="92" width="58" height="48" rx="12" fill="#cfe0f0" />
      <path d="M188 140 L196 152 L204 140 Z" fill="#cfe0f0" />
      <circle cx="197" cy="116" r="12" fill="#1f5d86" />

      {/* bookshelf */}
      <rect x="360" y="230" width="120" height="110" fill="#ffffff" stroke="#dbe4ef" strokeWidth="3" />
      <path d="M360 285 H480" stroke="#dbe4ef" strokeWidth="3" />
      <g>
        <rect x="372" y="244" width="10" height="38" fill="#7fa9d6" />
        <rect x="384" y="250" width="10" height="32" fill="#23263f" />
        <rect x="396" y="246" width="10" height="36" fill="#cfe0f0" />
        <rect x="420" y="296" width="10" height="40" fill="#f2b544" />
        <rect x="432" y="300" width="10" height="36" fill="#7fa9d6" />
        <rect x="444" y="292" width="10" height="44" fill="#23263f" />
      </g>

      {/* plant */}
      <g>
        <path d="M442 360 h34 l-5 40 h-24 Z" fill="#23263f" />
        <ellipse cx="459" cy="318" rx="10" ry="22" fill="#f2b544" transform="rotate(-18 459 318)" />
        <ellipse cx="474" cy="330" rx="8" ry="18" fill="#7fa9d6" transform="rotate(24 474 330)" />
        <ellipse cx="450" cy="340" rx="7" ry="15" fill="#f2b544" transform="rotate(-36 450 340)" />
        <path d="M459 360 V320" stroke="#23263f" strokeWidth="2" />
      </g>

      {/* waste bin */}
      <path d="M292 352 h34 l-4 46 h-26 Z" fill="#ffffff" stroke="#23263f" strokeWidth="2.5" />
      <path d="M302 358 l-2 36 M310 358 v36 M318 358 l2 36" stroke="#23263f" strokeWidth="1.5" opacity="0.5" />

      {/* floor */}
      <rect x="0" y="398" width="520" height="4" rx="2" fill="#dbe4ef" />

      {/* desk */}
      <rect x="120" y="262" width="168" height="10" rx="2" fill="#23263f" />
      <rect x="132" y="272" width="8" height="126" fill="#23263f" />
      <rect x="268" y="272" width="8" height="126" fill="#23263f" />
      <rect x="132" y="330" width="144" height="5" fill="#23263f" />

      {/* monitor */}
      <rect x="196" y="196" width="78" height="56" rx="4" fill="#23263f" />
      <rect x="202" y="202" width="66" height="44" rx="2" fill="#7fa9d6" />
      <rect x="226" y="252" width="18" height="10" fill="#23263f" />
      <rect x="168" y="256" width="40" height="5" rx="2" fill="#3b4170" />

      {/* chair */}
      <rect x="40" y="250" width="26" height="70" rx="8" fill="#f2b544" />
      <rect x="44" y="310" width="78" height="12" rx="5" fill="#f2b544" />
      <path d="M82 322 V378 M60 392 L82 378 L104 392" stroke="#23263f" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="394" r="4" fill="#23263f" />
      <circle cx="104" cy="394" r="4" fill="#23263f" />

      {/* person */}
      <g>
        {/* legs */}
        <path d="M78 312 Q130 306 150 314 L170 372" stroke="#5b8db8" strokeWidth="20" strokeLinecap="round" fill="none" />
        <path d="M168 372 h26 a6 6 0 0 1 6 6 v4 h-36 Z" fill="#23263f" />
        {/* torso */}
        <path d="M70 220 Q66 190 92 184 L112 182 Q134 186 136 214 L132 300 Q100 312 74 304 Z" fill="#2f3b52" />
        <path d="M100 186 L106 214 L112 186 Z" fill="#ffffff" />
        {/* arm reaching to the keyboard */}
        <path d="M120 206 Q146 236 176 246" stroke="#2f3b52" strokeWidth="16" strokeLinecap="round" fill="none" />
        <circle cx="180" cy="248" r="7" fill="#f2c7a5" />
        {/* head */}
        <rect x="98" y="164" width="14" height="20" rx="5" fill="#f2c7a5" />
        <circle cx="106" cy="148" r="22" fill="#f2c7a5" />
        <path d="M84 146 Q84 120 108 122 Q130 124 128 146 Q120 132 104 134 Q94 136 88 152 Z" fill="#23263f" />
        <circle cx="117" cy="150" r="2" fill="#23263f" />
      </g>
    </svg>
  );
}
