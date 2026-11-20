"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "Nimbus", the portal's mascot: a fluffy sky-blue cloud in a graduation cap.
 * Pure SVG, so it is crisp at any size and needs no image download.
 *   wave      – friendly, one arm waving (sign-in)
 *   confused  – scratching its head (404)
 *   worried   – for errors
 * Its eyes follow the pointer when `followPointer` is set.
 */
export function Mascot({
  mood = "wave",
  followPointer = false,
  className,
  title = "Nimbus, the Jain OOA Portal mascot",
}: {
  mood?: "wave" | "confused" | "worried";
  followPointer?: boolean;
  className?: string;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: mood === "confused" ? -2 : 0 });

  useEffect(() => {
    if (!followPointer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (event: PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height * 0.5;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / 260);
      setLook({ x: (dx / distance) * 5 * reach, y: (dy / distance) * 4.5 * reach });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [followPointer]);

  const fur = `fur-${id}`;
  const body = `body-${id}`;
  const shade = `shade-${id}`;

  return (
    <svg ref={ref} viewBox="0 0 260 290" role="img" aria-label={title} className={cn("mascot overflow-visible", className)}>
      <defs>
        {/* Fluffy edges: roughen the outline with noise. */}
        <filter id={fur} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id={body} cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#b9d8f8" />
          <stop offset="55%" stopColor="#7fb1ea" />
          <stop offset="100%" stopColor="#4f86cf" />
        </radialGradient>
        <radialGradient id={shade} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#23263f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#23263f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="130" cy="272" rx="78" ry="12" fill={`url(#${shade})`} className="mascot-shadow" />

      <g className="mascot-float">
        {/* feet */}
        <g filter={`url(#${fur})`} fill="#4f86cf">
          <ellipse cx="98" cy="252" rx="24" ry="15" />
          <ellipse cx="162" cy="252" rx="24" ry="15" />
        </g>

        {/* the arm on the left of the picture stays down */}
        <g filter={`url(#${fur})`}>
          <ellipse cx="40" cy="186" rx="20" ry="34" fill="#5f93d8" transform="rotate(18 40 186)" />
        </g>

        {/* body: a round fluffy cloud with a puffy crown */}
        <g filter={`url(#${fur})`} fill={`url(#${body})`}>
          <ellipse cx="130" cy="168" rx="92" ry="86" />
          <circle cx="78" cy="104" r="40" />
          <circle cx="182" cy="104" r="40" />
          <circle cx="130" cy="86" r="50" />
          <circle cx="50" cy="150" r="30" />
          <circle cx="210" cy="150" r="30" />
        </g>
        {/* lighter face */}
        <g filter={`url(#${fur})`}>
          <ellipse cx="130" cy="156" rx="64" ry="54" fill="#e6f2fd" />
        </g>
        {/* belly fluff */}
        <g filter={`url(#${fur})`}>
          <ellipse cx="130" cy="222" rx="40" ry="24" fill="#a9cdf3" opacity="0.8" />
        </g>

        {/* the other arm: waves, or scratches the head when confused */}
        <g className={mood === "confused" ? "mascot-scratch" : mood === "wave" ? "mascot-wave" : undefined} style={{ transformOrigin: "206px 168px" }}>
          <g filter={`url(#${fur})`}>
            {mood === "confused" ? (
              <ellipse cx="214" cy="112" rx="21" ry="44" fill="#5f93d8" transform="rotate(-28 214 112)" />
            ) : mood === "wave" ? (
              <ellipse cx="226" cy="122" rx="20" ry="40" fill="#5f93d8" transform="rotate(32 226 122)" />
            ) : (
              <ellipse cx="216" cy="178" rx="20" ry="32" fill="#5f93d8" transform="rotate(-18 216 178)" />
            )}
          </g>
        </g>

        {/* face */}
        <g>
          {/* eyebrows */}
          {mood !== "wave" && (
            <g stroke="#23263f" strokeWidth="5" strokeLinecap="round" fill="none">
              <path d={mood === "confused" ? "M88 110 Q101 101 114 106" : "M90 106 Q102 112 114 110"} />
              <path d={mood === "confused" ? "M146 104 Q159 104 170 112" : "M146 110 Q158 112 170 106"} />
            </g>
          )}
          <g className="mascot-blink">
            <ellipse cx="102" cy="140" rx="19" ry="22" fill="#ffffff" stroke="#23263f" strokeOpacity="0.12" strokeWidth="2" />
            <ellipse cx="158" cy="140" rx="19" ry="22" fill="#ffffff" stroke="#23263f" strokeOpacity="0.12" strokeWidth="2" />
            <g style={{ transform: `translate(${look.x}px, ${look.y}px)`, transition: "transform 120ms ease-out" }}>
              <circle cx="104" cy="143" r="10" fill="#23263f" />
              <circle cx="156" cy="143" r="10" fill="#23263f" />
              <circle cx="107.5" cy="139" r="3.4" fill="#ffffff" />
              <circle cx="159.5" cy="139" r="3.4" fill="#ffffff" />
            </g>
          </g>
          {/* cheeks */}
          <ellipse cx="80" cy="170" rx="13" ry="8" fill="#f6a5b7" opacity="0.55" />
          <ellipse cx="180" cy="170" rx="13" ry="8" fill="#f6a5b7" opacity="0.55" />
          {/* mouth */}
          {mood === "wave" && <path d="M114 174 Q130 190 146 174" stroke="#23263f" strokeWidth="5" strokeLinecap="round" fill="none" />}
          {mood === "confused" && <path d="M114 182 Q122 174 130 182 Q138 190 146 180" stroke="#23263f" strokeWidth="5" strokeLinecap="round" fill="none" />}
          {mood === "worried" && <ellipse cx="130" cy="182" rx="10" ry="8" fill="#23263f" />}
        </g>

        {/* graduation cap */}
        <g className="mascot-cap">
          <path d="M100 50 L100 66 Q130 80 160 66 L160 50 Z" fill="#23263f" />
          <path d="M130 22 L192 44 L130 66 L68 44 Z" fill="#2c3157" />
          <path d="M130 22 L192 44 L130 66 L68 44 Z" fill="none" stroke="#3b4170" strokeWidth="2" />
          <circle cx="130" cy="44" r="4" fill="#f2c94c" />
          <path d="M130 44 Q160 48 174 54 L176 78" stroke="#f2c94c" strokeWidth="3" fill="none" strokeLinecap="round" className="mascot-tassel" />
          <path d="M172 76 L180 76 L182 90 L170 90 Z" fill="#f2c94c" className="mascot-tassel" />
        </g>
      </g>

      {mood === "confused" && (
        <text x="232" y="56" fontSize="40" fontWeight="800" fill="#23263f" opacity="0.75" className="mascot-question">
          ?
        </text>
      )}
    </svg>
  );
}

/** Soft cartoon clouds drifting across a sky background. Decorative only. */
export function Clouds({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {[
        "left-[-6%] top-[8%] w-[34rem] cloud-drift-slow opacity-90",
        "right-[-8%] top-[4%] w-[40rem] cloud-drift opacity-80",
        "left-[30%] bottom-[-10%] w-[46rem] cloud-drift-slow opacity-70",
        "right-[10%] bottom-[18%] w-[22rem] cloud-drift opacity-60",
      ].map((position) => (
        <svg key={position} viewBox="0 0 400 160" className={cn("absolute h-auto", position)}>
          <g fill="#ffffff">
            <ellipse cx="200" cy="110" rx="190" ry="48" />
            <circle cx="120" cy="92" r="58" />
            <circle cx="210" cy="70" r="72" />
            <circle cx="290" cy="96" r="52" />
          </g>
        </svg>
      ))}
    </div>
  );
}
