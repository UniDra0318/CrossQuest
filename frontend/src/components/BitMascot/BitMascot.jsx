import { useId } from "react";
import "./BitMascot.css";

// Frost colorway. Change these to re-theme Bit.
const C = {
  ink: "#0B0B14",
  top: "#D6F5FF",
  main: "#2BB3F5",
  side: "#1569C2",
  acc: "#FF4D8D",
};

export default function BitMascot({ size = 240, animated = true, className = "", ...rest }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name) => `${name}-${uid}`;
  const { ink, top, main, side, acc } = C;
  const outline = { stroke: ink, strokeWidth: 6, strokeLinejoin: "round" };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 340 390"
      width={size}
      height={(size * 390) / 340}
      role="img"
      aria-label="Bit, the CrossQuest mascot"
      className={`cqbit ${animated ? "cqbit--animated" : ""} ${className}`}
      {...rest}
    >
      <defs>
        <radialGradient id={id("aura")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={acc} stopOpacity=".30" />
          <stop offset="1" stopColor={acc} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={acc} stopOpacity=".7" />
          <stop offset="1" stopColor={acc} stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("hc")}>
          <rect x="92" y="76" width="156" height="140" rx="38" />
        </clipPath>
        <clipPath id={id("tc")}>
          <rect x="116" y="232" width="108" height="100" rx="28" />
        </clipPath>
      </defs>

      <circle className="cqbit-aura" cx="170" cy="200" r="168" fill={`url(#${id("aura")})`} />
      <ellipse className="cqbit-shadow" cx="170" cy="376" rx="72" ry="9" fill={ink} opacity=".16" />

      {/* boots */}
      <rect x="124" y="332" width="36" height="22" rx="10" fill="#fff" {...outline} />
      <rect x="180" y="332" width="36" height="22" rx="10" fill="#fff" {...outline} />
      <rect x="132" y="343" width="20" height="4" rx="2" fill={acc} />
      <rect x="188" y="343" width="20" height="4" rx="2" fill={acc} />

      {/* BODY (moves down while the head floats up) */}
      <g className="cqbit-body">
        {/* right arm (waving) */}
        <g className="cqbit-wave">
          <line x1="222" y1="272" x2="268" y2="226" stroke={ink} strokeWidth="16" strokeLinecap="round" />
          <line x1="222" y1="272" x2="268" y2="226" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* left arm + controller */}
        <line x1="118" y1="284" x2="92" y2="302" stroke={ink} strokeWidth="16" strokeLinecap="round" />
        <line x1="118" y1="284" x2="92" y2="302" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <g transform="translate(66 312) rotate(-14)">
          <path
            d="M-36 -9 Q-36 -16 -27 -16 H27 Q36 -16 36 -9 L40 14 Q41 23 31 23 Q24 23 20 16 L17 10 H-17 L-20 16 Q-24 23 -31 23 Q-41 23 -40 14Z"
            fill={ink}
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M-25 -4 h12 M-19 -10 v12" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="17" cy="-7" r="2.6" fill={acc} />
          <circle cx="25" cy="-7" r="2.6" fill="#fff" />
          <circle cx="17" cy="1" r="2.6" fill="#fff" />
          <circle cx="25" cy="1" r="2.6" fill={acc} />
        </g>

        {/* torso */}
        <rect x="116" y="232" width="108" height="100" rx="28" fill={main} />
        <g clipPath={`url(#${id("tc")})`}>
          <rect x="116" y="232" width="108" height="14" fill={top} />
          <rect x="206" y="232" width="18" height="100" fill={side} />
        </g>
        <rect x="116" y="232" width="108" height="100" rx="28" fill="none" {...outline} />

        {/* keyhole core */}
        <circle className="cqbit-pulse" cx="170" cy="270" r="30" fill={`url(#${id("glow")})`} />
        <circle cx="170" cy="270" r="21" fill={ink} stroke={acc} strokeWidth="3" />
        <circle cx="170" cy="266" r="6.5" fill={acc} />
        <path d="M166.5 268.5 L173.5 268.5 L177 283 L163 283Z" fill={acc} />

        {/* mini progress chart + flag */}
        <rect x="136" y="299" width="68" height="26" rx="6" fill={ink} stroke="#fff" strokeWidth="2.5" />
        <rect x="146" y="314" width="10" height="7" fill={acc} />
        <rect x="160" y="309" width="10" height="12" fill={acc} />
        <rect x="174" y="303" width="10" height="18" fill={acc} />
        <line x1="189" y1="321" x2="189" y2="304" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M189 304 l8 3 l-8 3z" fill="#fff" />

        {/* hands */}
        <circle cx="92" cy="302" r="14" fill={acc} stroke={ink} strokeWidth="5" />
        <circle cx="87" cy="297" r="4" fill="#fff" opacity=".7" />
        <g className="cqbit-wave">
          <circle cx="272" cy="216" r="17" fill={acc} stroke={ink} strokeWidth="5" />
          <circle cx="266" cy="210" r="4.5" fill="#fff" opacity=".7" />
        </g>
      </g>

      {/* HEAD (floats up while the body sinks) */}
      <g className="cqbit-head">
        {/* antenna + flag */}
        <line x1="170" y1="76" x2="170" y2="34" stroke={ink} strokeWidth="6" strokeLinecap="round" />
        <circle cx="170" cy="30" r="7" fill={acc} stroke={ink} strokeWidth="4" />
        <g className="cqbit-flag">
          <path d="M172 38 L206 49 L172 60Z" fill={acc} stroke={ink} strokeWidth="4.5" strokeLinejoin="round" />
        </g>

        {/* ear ports */}
        <rect x="76" y="118" width="22" height="56" rx="10" fill={ink} />
        <rect x="242" y="118" width="22" height="56" rx="10" fill={ink} />
        <rect x="81" y="128" width="9" height="36" rx="4.5" fill={acc} />
        <rect x="250" y="128" width="9" height="36" rx="4.5" fill={acc} />

        {/* head block */}
        <rect x="92" y="76" width="156" height="140" rx="38" fill={main} />
        <g clipPath={`url(#${id("hc")})`}>
          <rect x="92" y="76" width="156" height="16" fill={top} />
          <rect x="228" y="76" width="20" height="140" fill={side} />
        </g>
        <rect x="92" y="76" width="156" height="140" rx="38" fill="none" stroke={ink} strokeWidth="7" strokeLinejoin="round" />

        {/* visor + eyes */}
        <rect x="108" y="108" width="124" height="68" rx="34" fill={ink} stroke={acc} strokeWidth="3" />
        <circle cx="142" cy="144" r="30" fill={`url(#${id("glow")})`} />
        <circle cx="198" cy="144" r="30" fill={`url(#${id("glow")})`} />
        <rect className="cqbit-eye" x="128" y="128" width="28" height="32" rx="10" fill={acc} />
        <rect className="cqbit-eye" x="184" y="128" width="28" height="32" rx="10" fill={acc} />
        <rect x="124" y="120" width="36" height="12" fill={ink} transform="rotate(-10 142 126)" />
        <rect x="180" y="120" width="36" height="12" fill={ink} transform="rotate(10 198 126)" />
        <circle className="cqbit-eye" cx="148" cy="148" r="4" fill="#fff" />
        <circle className="cqbit-eye" cx="204" cy="148" r="4" fill="#fff" />

        {/* smirk */}
        <path d="M148 194 q22 14 46 -6" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* sparkles + motion lines */}
      <g fill={acc} stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
        <path className="cqbit-tw" d="M42 96 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z" />
        <path className="cqbit-tw cqbit-tw2" d="M300 300 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" />
      </g>
      <g className="cqbit-lines" stroke={acc} strokeWidth="5" strokeLinecap="round">
        <path d="M300 186 l9 -9" />
        <path d="M308 212 h13" />
        <path d="M288 174 l-2 -12" />
      </g>
    </svg>
  );
}
