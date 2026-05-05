"use client";

const CX = 330;
const CY = 290;

// 6 services at 60° intervals on a circle of R=200
const SERVICES = [
  {
    x: 330, y: 90,
    title: "Custom Software",
    del1: "ERP · CRM · Portals",
    del2: "Dashboards · Workflows",
    tech: "Next.js · Node.js · PostgreSQL",
    color: "#3b82f6",
    icon: "code",
    floatKf: "ha-float-a",
    floatDur: "5s",
    delay: "0s",
  },
  {
    x: 503, y: 190,
    title: "SaaS Platforms",
    del1: "MVPs · Subscriptions",
    del2: "Multi-tenant · Billing",
    tech: "React · Stripe · Paystack",
    color: "#8b5cf6",
    icon: "layers",
    floatKf: "ha-float-b",
    floatDur: "6.5s",
    delay: "0.3s",
  },
  {
    x: 503, y: 390,
    title: "Mobile Apps",
    del1: "iOS · Android Apps",
    del2: "Delivery · Booking · Staff",
    tech: "Flutter · React Native",
    color: "#f97316",
    icon: "phone",
    floatKf: "ha-float-a",
    floatDur: "5.5s",
    delay: "0.6s",
  },
  {
    x: 330, y: 490,
    title: "POS & ERP Systems",
    del1: "Retail · Restaurant",
    del2: "Hotel · School · Hospital",
    tech: "CliqPOS · Custom ERP",
    color: "#ef4444",
    icon: "grid",
    floatKf: "ha-float-c",
    floatDur: "7s",
    delay: "0.9s",
  },
  {
    x: 157, y: 390,
    title: "AI Automation",
    del1: "WhatsApp · Workflows",
    del2: "CRM · Auto-Reports",
    tech: "Python · GPT · n8n",
    color: "#f59e0b",
    icon: "zap",
    floatKf: "ha-float-b",
    floatDur: "6s",
    delay: "1.2s",
  },
  {
    x: 157, y: 190,
    title: "Website Design",
    del1: "Corporate · E-Commerce",
    del2: "Landing Pages · SEO",
    tech: "Next.js · Tailwind · CMS",
    color: "#10b981",
    icon: "globe",
    floatKf: "ha-float-a",
    floatDur: "5.8s",
    delay: "1.5s",
  },
];

const TECH_DOTS = [
  { x: 450, y: 290, label: "React",   color: "#61dafb" },
  { x: 390, y: 394, label: "AWS",     color: "#ff9900" },
  { x: 270, y: 394, label: "Python",  color: "#fbbf24" },
  { x: 210, y: 290, label: "PgSQL",   color: "#60a5fa" },
  { x: 270, y: 186, label: "Flutter", color: "#54c5f8" },
  { x: 390, y: 186, label: "Node.js", color: "#6ee7b7" },
];

function ServiceIcon({ type, color }: { type: string; color: string }) {
  const p = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  switch (type) {
    case "code":
      return (
        <>
          <polyline points="16 18 22 12 16 6" {...p} />
          <polyline points="8 6 2 12 8 18" {...p} />
        </>
      );
    case "layers":
      return (
        <>
          <polygon points="12 2 2 7 12 12 22 7 12 2" {...p} />
          <polyline points="2 17 12 22 22 17" {...p} />
          <polyline points="2 12 12 17 22 12" {...p} />
        </>
      );
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="10" {...p} />
          <line x1="2" y1="12" x2="22" y2="12" {...p} />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...p} />
        </>
      );
    case "phone":
      return (
        <>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" {...p} />
          <line x1="12" y1="18" x2="12.01" y2="18" {...p} />
        </>
      );
    case "zap":
      return <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...p} />;
    case "grid":
      return (
        <>
          <rect x="3" y="3" width="7" height="7" {...p} />
          <rect x="14" y="3" width="7" height="7" {...p} />
          <rect x="14" y="14" width="7" height="7" {...p} />
          <rect x="3" y="14" width="7" height="7" {...p} />
        </>
      );
    default:
      return null;
  }
}

export default function HeroAnimation() {
  return (
    <div
      className="relative w-full flex items-center justify-center select-none"
      style={{ minHeight: 480 }}
    >
      <style>{`
        @keyframes ha-spin-cw  { to { transform: rotate(360deg);  } }
        @keyframes ha-spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes ha-float-a  { 0%,100% { transform:translateY(0);    } 50% { transform:translateY(-9px); } }
        @keyframes ha-float-b  { 0%,100% { transform:translateY(0);    } 50% { transform:translateY(8px);  } }
        @keyframes ha-float-c  { 0%,100% { transform:translateY(0);    } 50% { transform:translateY(-5px); } }
        @keyframes ha-center-g { 0%,100% { filter:drop-shadow(0 0 10px #3b82f6); } 50% { filter:drop-shadow(0 0 28px #6366f1); } }
        @keyframes ha-line-flow {
          0%   { stroke-dashoffset:90; opacity:0; }
          15%  { opacity:.8; }
          85%  { opacity:.8; }
          100% { stroke-dashoffset:0; opacity:0; }
        }
        @keyframes ha-fade-in { from { opacity:0; } to { opacity:1; } }
        @keyframes ha-dot-pop { 0%{opacity:0;transform:scale(.3)} 70%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }

        .ha-ring-1 { transform-origin:${CX}px ${CY}px; animation:ha-spin-cw  30s linear infinite; }
        .ha-ring-2 { transform-origin:${CX}px ${CY}px; animation:ha-spin-ccw 20s linear infinite; }
        .ha-center { transform-origin:${CX}px ${CY}px; animation:ha-center-g  3s ease-in-out infinite; }
        .ha-line-flow { stroke-dasharray:12 6; animation:ha-line-flow 3s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 660 580"
        className="w-full max-w-[580px]"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="ha-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="ha-cg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#818cf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <filter id="ha-glow-sm">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="ha-glow-lg">
            <feGaussianBlur stdDeviation="10" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Background glow */}
        <circle cx={CX} cy={CY} r="230" fill="url(#ha-bg)" />

        {/* Orbital rings */}
        <circle cx={CX} cy={CY} r="200"
          fill="none" stroke="#3b82f6" strokeWidth="0.8"
          strokeOpacity="0.18" strokeDasharray="6 10"
          className="ha-ring-1"
        />
        <circle cx={CX} cy={CY} r="120"
          fill="none" stroke="#8b5cf6" strokeWidth="0.7"
          strokeOpacity="0.2" strokeDasharray="3 12"
          className="ha-ring-2"
        />
        <circle cx={CX} cy={CY} r="88"
          fill="none" stroke="#3b82f6" strokeWidth="1"
          strokeOpacity="0.12"
        />

        {/* Connection lines: center to each service card */}
        {SERVICES.map((n, i) => (
          <g key={`line-${i}`}>
            <line x1={CX} y1={CY} x2={n.x} y2={n.y}
              stroke={n.color} strokeWidth="0.5" strokeOpacity="0.1" />
            <line x1={CX} y1={CY} x2={n.x} y2={n.y}
              stroke={n.color} strokeWidth="1.2"
              className="ha-line-flow"
              style={{
                animationDelay: `${i * 0.55}s`,
                animationDuration: `${2.5 + i * 0.2}s`,
              }}
            />
          </g>
        ))}

        {/* Inner tech-stack dots */}
        {TECH_DOTS.map((d, i) => (
          <g key={`tech-${i}`}
            style={{
              animation: `ha-dot-pop 0.4s ${0.8 + i * 0.12}s ease forwards, ${i % 2 === 0 ? "ha-float-a" : "ha-float-b"} ${4.5 + i * 0.5}s ${i * 0.2}s ease-in-out infinite`,
              opacity: 0,
            }}
          >
            <circle cx={d.x} cy={d.y} r="14" fill={d.color} opacity="0.06" />
            <circle cx={d.x} cy={d.y} r="5"  fill={d.color} opacity="0.9" filter="url(#ha-glow-sm)" />
            <text x={d.x} y={d.y - 10}
              textAnchor="middle"
              fill={d.color} fontSize="8" fontWeight="700" opacity="0.9"
              fontFamily="system-ui, sans-serif"
            >{d.label}</text>
          </g>
        ))}

        {/* Service cards */}
        {SERVICES.map((n, i) => {
          const tx = n.x - 68;
          const ty = n.y - 38;
          return (
            <g key={`card-${i}`}
              style={{
                animation: `ha-fade-in 0.5s ${n.delay} ease forwards, ${n.floatKf} ${n.floatDur} ${n.delay} ease-in-out infinite`,
                opacity: 0,
              }}
            >
              {/* Glow halo */}
              <rect x={tx - 3} y={ty - 3} width="142" height="82" rx="15"
                fill={n.color} fillOpacity="0.06" />
              {/* Card body */}
              <rect x={tx} y={ty} width="136" height="76" rx="12"
                fill="#070e2e" fillOpacity="0.9"
                stroke={n.color} strokeWidth="1" strokeOpacity="0.4" />
              {/* Left accent bar */}
              <rect x={tx} y={ty} width="4" height="76" rx="2"
                fill={n.color} fillOpacity="0.9" />
              {/* Icon badge */}
              <rect x={tx + 11} y={ty + 14} width="22" height="22" rx="6"
                fill={n.color} fillOpacity="0.18" />
              {/* Icon (24×24 source scaled 0.75×, placed in badge) */}
              <g transform={`translate(${tx + 13}, ${ty + 16}) scale(0.75)`}>
                <ServiceIcon type={n.icon} color={n.color} />
              </g>
              {/* Service name */}
              <text x={tx + 39} y={ty + 25}
                fill="white" fontSize="9.5" fontWeight="800"
                fontFamily="system-ui, sans-serif"
              >{n.title}</text>
              {/* Deliverable 1 */}
              <text x={tx + 39} y={ty + 37}
                fill="#94a3b8" fontSize="8.5"
                fontFamily="system-ui, sans-serif"
              >{n.del1}</text>
              {/* Deliverable 2 */}
              <text x={tx + 39} y={ty + 48}
                fill="#94a3b8" fontSize="8.5"
                fontFamily="system-ui, sans-serif"
              >{n.del2}</text>
              {/* Tech tag pill */}
              <rect x={tx + 11} y={ty + 56} width="113" height="13" rx="6.5"
                fill={n.color} fillOpacity="0.12" />
              <text x={tx + 67} y={ty + 66}
                textAnchor="middle"
                fill={n.color} fontSize="7.5" fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >{n.tech}</text>
            </g>
          );
        })}

        {/* Center hub */}
        <circle cx={CX} cy={CY} r="55" fill="#3b82f6" opacity="0.04" />
        <circle cx={CX} cy={CY} r="40"
          fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.35"
          filter="url(#ha-glow-sm)"
        />
        <circle cx={CX} cy={CY} r="32"
          fill="url(#ha-cg)" filter="url(#ha-glow-lg)"
          className="ha-center"
        />
        <circle cx={CX} cy={CY} r="24" fill="url(#ha-cg)" />
        <text x={CX} y={CY + 6}
          textAnchor="middle"
          fill="white" fontSize="15" fontWeight="900" letterSpacing="-0.5"
          fontFamily="system-ui, sans-serif"
        >RS</text>
        <text x={CX} y={CY + 54}
          textAnchor="middle"
          fill="#475569" fontSize="8.5" fontWeight="500"
          fontFamily="system-ui, sans-serif"
        >RaveSoft · 6 Services · 54 Countries</text>
      </svg>
    </div>
  );
}
