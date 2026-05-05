"use client";

const CX = 280;
const CY = 255;
const R = 185;

const NODES = [
  {
    x: 280, y: 70,
    label: "Web Dev", sub: "React · Next.js", color: "#3b82f6",
    lx: 280, ly1: 44, ly2: 56, anchor: "middle",
    floatCls: "ha-float-a", delay: "0s",
  },
  {
    x: 440, y: 163,
    label: "Mobile Apps", sub: "iOS · Android", color: "#8b5cf6",
    lx: 464, ly1: 157, ly2: 169, anchor: "start",
    floatCls: "ha-float-b", delay: "0.4s",
  },
  {
    x: 440, y: 348,
    label: "SaaS", sub: "Cloud Platforms", color: "#06b6d4",
    lx: 464, ly1: 342, ly2: 354, anchor: "start",
    floatCls: "ha-float-a", delay: "0.8s",
  },
  {
    x: 280, y: 440,
    label: "ERP · POS", sub: "Business Systems", color: "#10b981",
    lx: 280, ly1: 466, ly2: 478, anchor: "middle",
    floatCls: "ha-float-b", delay: "1.2s",
  },
  {
    x: 120, y: 348,
    label: "Automation", sub: "AI · Workflows", color: "#f59e0b",
    lx: 96, ly1: 342, ly2: 354, anchor: "end",
    floatCls: "ha-float-c", delay: "1.6s",
  },
  {
    x: 120, y: 163,
    label: "APIs", sub: "Integrations", color: "#ec4899",
    lx: 96, ly1: 157, ly2: 169, anchor: "end",
    floatCls: "ha-float-a", delay: "2.0s",
  },
];

const INNER_DOTS = [
  { x: CX + 115, y: CY,         label: "Ghana",   color: "#fbbf24" },
  { x: CX - 57,  y: CY + 99,   label: "Nigeria",  color: "#34d399" },
  { x: CX - 57,  y: CY - 99,   label: "Kenya",    color: "#60a5fa" },
];

const STATS = [
  { title: "Projects Delivered", value: "500+", sub: "↑ 48% this year",  subColor: "#4ade80", delay: "0s"   },
  { title: "Countries Reached",  value: "54",   sub: "All 54 in Africa", subColor: "#60a5fa", delay: "0.25s" },
  { title: "Client Satisfaction",value: "98%",  sub: "★ 4.9 / 5 rating", subColor: "#c084fc", delay: "0.5s" },
];

export default function HeroAnimation() {
  return (
    <div className="relative w-full flex items-center justify-center select-none" style={{ minHeight: 480 }}>
      <style>{`
        @keyframes ha-spin-cw  { from { transform: rotate(0deg);    } to { transform: rotate(360deg);  } }
        @keyframes ha-spin-ccw { from { transform: rotate(0deg);    } to { transform: rotate(-360deg); } }
        @keyframes ha-float-a  { 0%,100% { transform: translateY(0px);   } 50% { transform: translateY(-10px); } }
        @keyframes ha-float-b  { 0%,100% { transform: translateY(0px);   } 50% { transform: translateY(8px);  } }
        @keyframes ha-float-c  { 0%,100% { transform: translateY(0px);   } 50% { transform: translateY(-6px);  } }
        @keyframes ha-ring-pulse { 0%,100% { opacity:.15; } 50% { opacity:.4; } }
        @keyframes ha-center-glow { 0%,100% { filter: drop-shadow(0 0 10px #3b82f6); } 50% { filter: drop-shadow(0 0 26px #6366f1); } }
        @keyframes ha-line-flow {
          0%   { stroke-dashoffset: 80; opacity: 0; }
          15%  { opacity: .9; }
          85%  { opacity: .9; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes ha-fade-up { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ha-node-pop { 0% { opacity:0; transform:scale(.5); } 80% { transform:scale(1.1); } 100% { opacity:1; transform:scale(1); } }

        .ha-ring-1 { transform-origin: ${CX}px ${CY}px; animation: ha-spin-cw  28s linear infinite; }
        .ha-ring-2 { transform-origin: ${CX}px ${CY}px; animation: ha-spin-ccw 18s linear infinite; }
        .ha-ring-3 { transform-origin: ${CX}px ${CY}px; animation: ha-ring-pulse 4s ease-in-out infinite; }
        .ha-center { transform-origin: ${CX}px ${CY}px; animation: ha-center-glow 3s ease-in-out infinite; }
        .ha-float-a { animation: ha-float-a 5s ease-in-out infinite; }
        .ha-float-b { animation: ha-float-b 6.5s ease-in-out infinite; }
        .ha-float-c { animation: ha-float-c 7.2s ease-in-out infinite; }
        .ha-line-flow { stroke-dasharray: 10 5; animation: ha-line-flow 3s ease-in-out infinite; }

        .ha-stat { animation: ha-fade-up .7s ease forwards, ha-float-a 6s ease-in-out 1s infinite; opacity:0; }
        .ha-stat-b { animation: ha-fade-up .7s .25s ease forwards, ha-float-b 7s ease-in-out 1.25s infinite; opacity:0; }
        .ha-stat-c { animation: ha-fade-up .7s .5s ease forwards, ha-float-c 8s ease-in-out 1.5s infinite; opacity:0; }
        .ha-node { animation: ha-node-pop .5s ease forwards; opacity:0; }
      `}</style>

      {/* SVG orbital visualization */}
      <svg
        viewBox="0 0 560 510"
        className="w-full max-w-[540px]"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="ha-bg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="ha-center-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#818cf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
          <filter id="ha-glow-sm">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="ha-glow-lg">
            <feGaussianBlur stdDeviation="9" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Ambient background glow */}
        <circle cx={CX} cy={CY} r="220" fill="url(#ha-bg-glow)" />

        {/* ── Orbital rings ───────────────────────────────── */}
        <circle cx={CX} cy={CY} r={R + 10}
          fill="none" stroke="#3b82f6" strokeWidth="1"
          strokeOpacity="0.15" strokeDasharray="7 9"
          className="ha-ring-1"
        />
        <circle cx={CX} cy={CY} r="130"
          fill="none" stroke="#818cf8" strokeWidth="1"
          strokeOpacity="0.2" strokeDasharray="3 14"
          className="ha-ring-2"
        />
        <circle cx={CX} cy={CY} r="80"
          fill="none" stroke="#3b82f6" strokeWidth="1.5"
          strokeOpacity="0.2"
          className="ha-ring-3"
        />

        {/* ── Static + animated connection lines ──────────── */}
        {NODES.map((n, i) => (
          <g key={`line-${i}`}>
            <line x1={CX} y1={CY} x2={n.x} y2={n.y}
              stroke={n.color} strokeWidth="0.6" strokeOpacity="0.12" />
            <line x1={CX} y1={CY} x2={n.x} y2={n.y}
              stroke={n.color} strokeWidth="1.5"
              className="ha-line-flow"
              style={{ animationDelay: `${i * 0.5}s`, animationDuration: `${2.4 + i * 0.25}s` }}
            />
          </g>
        ))}

        {/* ── Inner accent dots (countries) ───────────────── */}
        {INNER_DOTS.map((d, i) => (
          <g key={`inner-${i}`} className={i % 2 === 0 ? "ha-float-b" : "ha-float-c"}
             style={{ animationDelay: `${i * 0.7}s` }}>
            <circle cx={d.x} cy={d.y} r="12" fill={d.color} opacity="0.08" />
            <circle cx={d.x} cy={d.y} r="4"  fill={d.color} opacity="0.9"  filter="url(#ha-glow-sm)" />
            <text x={d.x + 10} y={d.y + 4} fill={d.color} fontSize="9" fontWeight="700" opacity="0.85">{d.label}</text>
          </g>
        ))}

        {/* ── Outer service nodes ──────────────────────────── */}
        {NODES.map((n, i) => (
          <g key={`node-${i}`}
             className={`${n.floatCls} ha-node`}
             style={{ animationDelay: n.delay, animationDuration: n.floatCls === "ha-float-a" ? "5s" : n.floatCls === "ha-float-b" ? "6.5s" : "7.2s" }}>
            {/* Outer halo */}
            <circle cx={n.x} cy={n.y} r="20" fill={n.color} opacity="0.07" />
            {/* Mid ring */}
            <circle cx={n.x} cy={n.y} r="11" fill={n.color} opacity="0.18" filter="url(#ha-glow-sm)" />
            {/* Core dot */}
            <circle cx={n.x} cy={n.y} r="7"  fill={n.color} opacity="0.95" filter="url(#ha-glow-sm)" />
            {/* White highlight */}
            <circle cx={n.x - 2} cy={n.y - 2} r="2" fill="white" opacity="0.6" />
            {/* Labels */}
            <text x={n.lx} y={n.ly1}
              textAnchor={n.anchor as "middle" | "start" | "end"}
              fill="white" fontSize="11" fontWeight="700" opacity="0.92"
            >{n.label}</text>
            <text x={n.lx} y={n.ly2}
              textAnchor={n.anchor as "middle" | "start" | "end"}
              fill="#94a3b8" fontSize="9" fontWeight="400"
            >{n.sub}</text>
          </g>
        ))}

        {/* ── Center node ──────────────────────────────────── */}
        <circle cx={CX} cy={CY} r="42" fill="#3b82f6" opacity="0.06" className="ha-ring-3" />
        <circle cx={CX} cy={CY} r="28" fill="url(#ha-center-grad)"
          filter="url(#ha-glow-lg)" className="ha-center" />
        <circle cx={CX} cy={CY} r="18" fill="url(#ha-center-grad)" />
        <text x={CX} y={CY + 6} textAnchor="middle"
          fill="white" fontSize="13" fontWeight="900" letterSpacing="-0.5"
        >RS</text>
      </svg>

      {/* ── Floating stat cards ─────────────────────────── */}
      <div className="ha-stat absolute top-6 right-1 sm:right-6 rounded-2xl px-4 py-3 border border-white/10"
           style={{ background: "rgba(10,18,60,0.85)", backdropFilter: "blur(12px)", minWidth: 148 }}>
        <p className="text-[10px] text-gray-400 font-medium mb-1">Projects Delivered</p>
        <p className="text-2xl font-black text-white leading-none">500+</p>
        <p className="text-[10px] text-green-400 font-semibold mt-1">↑ 48% this year</p>
      </div>

      <div className="ha-stat-b absolute bottom-20 right-1 sm:right-6 rounded-2xl px-4 py-3 border border-white/10"
           style={{ background: "rgba(10,18,60,0.85)", backdropFilter: "blur(12px)", minWidth: 140 }}>
        <p className="text-[10px] text-gray-400 font-medium mb-1">Countries Reached</p>
        <p className="text-2xl font-black text-white leading-none">54</p>
        <p className="text-[10px] text-blue-400 font-semibold mt-1">All Africa</p>
      </div>

      <div className="ha-stat-c absolute top-28 left-1 sm:left-4 rounded-2xl px-4 py-3 border border-white/10"
           style={{ background: "rgba(10,18,60,0.85)", backdropFilter: "blur(12px)", minWidth: 148 }}>
        <p className="text-[10px] text-gray-400 font-medium mb-1">Client Satisfaction</p>
        <p className="text-2xl font-black text-white leading-none">98%</p>
        <p className="text-[10px] text-purple-400 font-semibold mt-1">★ 4.9 / 5 avg rating</p>
      </div>
    </div>
  );
}
