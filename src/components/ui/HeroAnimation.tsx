"use client";

const CX = 360;
const CY = 310;

const PRODUCTS = [
  {
    x: 360, y: 120,
    name: "CliqPOS",
    tag: "POS & Business Management",
    feat1: "Sales · Inventory · Receipts",
    feat2: "Multi-branch · Staff Accounts",
    badge: "Most Popular",
    color: "#3b82f6",
    icon: "pos",
    floatKf: "ha-float-a",
    floatDur: "5s",
    delay: "0s",
  },
  {
    x: 524, y: 215,
    name: "Hotel System",
    tag: "Full Hotel Operations",
    feat1: "Bookings · Guests · Rooms",
    feat2: "Billing · Housekeeping · Reports",
    badge: null,
    color: "#8b5cf6",
    icon: "hotel",
    floatKf: "ha-float-b",
    floatDur: "6.5s",
    delay: "0.3s",
  },
  {
    x: 524, y: 405,
    name: "Hospital System",
    tag: "Healthcare Management",
    feat1: "Patients · Billing · Pharmacy",
    feat2: "Lab · Appointments · Records",
    badge: null,
    color: "#ef4444",
    icon: "hospital",
    floatKf: "ha-float-a",
    floatDur: "5.5s",
    delay: "0.6s",
  },
  {
    x: 360, y: 500,
    name: "School System",
    tag: "Academic Management",
    feat1: "Admissions · Fees · Attendance",
    feat2: "Results · Parents · Staff",
    badge: null,
    color: "#10b981",
    icon: "school",
    floatKf: "ha-float-c",
    floatDur: "7s",
    delay: "0.9s",
  },
  {
    x: 196, y: 405,
    name: "HR & Payroll",
    tag: "Human Resource Software",
    feat1: "Staff · Attendance · Leave",
    feat2: "Payroll · Payslips · Appraisals",
    badge: "New",
    color: "#f59e0b",
    icon: "hr",
    floatKf: "ha-float-b",
    floatDur: "6s",
    delay: "1.2s",
  },
  {
    x: 196, y: 215,
    name: "ERP System",
    tag: "Business Operations Platform",
    feat1: "Sales · Inventory · Accounting",
    feat2: "Procurement · HR · Reports",
    badge: null,
    color: "#f97316",
    icon: "erp",
    floatKf: "ha-float-a",
    floatDur: "5.8s",
    delay: "1.5s",
  },
];

// Inner orbit tech / industry dots
const DOTS = [
  { x: 475, y: 310, label: "Retail",    color: "#60a5fa" },
  { x: 460, y: 368, label: "Health",    color: "#f87171" },
  { x: 260, y: 368, label: "Schools",   color: "#34d399" },
  { x: 245, y: 310, label: "Hotels",    color: "#a78bfa" },
  { x: 260, y: 252, label: "Finance",   color: "#fbbf24" },
  { x: 460, y: 252, label: "Logistics", color: "#fb923c" },
];

// Lucide-style SVG icon paths (24×24 viewport)
function ProdIcon({ type, color }: { type: string; color: string }) {
  const s = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (type) {
    case "pos": // shopping-cart style
      return (
        <>
          <circle cx="9" cy="21" r="1.5" fill={color} />
          <circle cx="20" cy="21" r="1.5" fill={color} />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" {...s} />
        </>
      );
    case "hotel": // building
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" {...s} />
          <path d="M3 9h18" {...s} />
          <path d="M9 21V9" {...s} />
          <rect x="13" y="13" width="3" height="4" {...s} />
        </>
      );
    case "hospital": // heart with cross
      return (
        <>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...s} />
          <line x1="12" y1="9" x2="12" y2="15" {...s} />
          <line x1="9" y1="12" x2="15" y2="12" {...s} />
        </>
      );
    case "school": // graduation cap
      return (
        <>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" {...s} />
          <path d="M6 12v5c3 3 9 3 12 0v-5" {...s} />
        </>
      );
    case "hr": // users
      return (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s} />
          <circle cx="9" cy="7" r="4" {...s} />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s} />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" {...s} />
        </>
      );
    case "erp": // layout-dashboard
      return (
        <>
          <rect x="3" y="3" width="7" height="9" rx="1" {...s} />
          <rect x="14" y="3" width="7" height="5" rx="1" {...s} />
          <rect x="14" y="12" width="7" height="9" rx="1" {...s} />
          <rect x="3" y="16" width="7" height="5" rx="1" {...s} />
        </>
      );
    default:
      return null;
  }
}

export default function HeroAnimation() {
  return (
    <div className="relative w-full flex items-center justify-center select-none" style={{ minHeight: 480 }}>
      <style>{`
        @keyframes ha-spin-cw  { to { transform: rotate(360deg);  } }
        @keyframes ha-spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes ha-float-a  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-9px)} }
        @keyframes ha-float-b  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(8px)}  }
        @keyframes ha-float-c  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-5px)} }
        @keyframes ha-center-g { 0%,100%{filter:drop-shadow(0 0 10px #3b82f6)} 50%{filter:drop-shadow(0 0 28px #6366f1)} }
        @keyframes ha-line-flow {
          0%  {stroke-dashoffset:90;opacity:0}
          15% {opacity:.8}
          85% {opacity:.8}
          100%{stroke-dashoffset:0;opacity:0}
        }
        @keyframes ha-fade-in { from{opacity:0} to{opacity:1} }
        @keyframes ha-dot-pop { 0%{opacity:0;transform:scale(.3)} 70%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
        @keyframes ha-badge    { 0%,100%{opacity:.85} 50%{opacity:1} }

        .ha-ring-1{transform-origin:${CX}px ${CY}px;animation:ha-spin-cw  32s linear infinite}
        .ha-ring-2{transform-origin:${CX}px ${CY}px;animation:ha-spin-ccw 22s linear infinite}
        .ha-center{transform-origin:${CX}px ${CY}px;animation:ha-center-g  3s ease-in-out infinite}
        .ha-line-flow{stroke-dasharray:12 6;animation:ha-line-flow 3s ease-in-out infinite}
        .ha-badge{animation:ha-badge 2.5s ease-in-out infinite}
      `}</style>

      <svg viewBox="0 0 720 620" className="w-full max-w-[680px]" style={{ overflow: "visible" }} aria-hidden="true">
        <defs>
          <radialGradient id="hb-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="hb-cg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#818cf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <filter id="hb-glow-sm">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="hb-glow-lg">
            <feGaussianBlur stdDeviation="10" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Ambient bg glow */}
        <circle cx={CX} cy={CY} r="240" fill="url(#hb-bg)" />

        {/* Orbital rings */}
        <circle cx={CX} cy={CY} r="200"
          fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="6 10"
          className="ha-ring-1" />
        <circle cx={CX} cy={CY} r="125"
          fill="none" stroke="#818cf8" strokeWidth="0.7" strokeOpacity="0.18" strokeDasharray="3 13"
          className="ha-ring-2" />
        <circle cx={CX} cy={CY} r="88"
          fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.1" />

        {/* Connection lines */}
        {PRODUCTS.map((p, i) => (
          <g key={`ln-${i}`}>
            <line x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke={p.color} strokeWidth="0.5" strokeOpacity="0.1" />
            <line x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke={p.color} strokeWidth="1.4"
              className="ha-line-flow"
              style={{ animationDelay: `${i * 0.55}s`, animationDuration: `${2.5 + i * 0.2}s` }} />
          </g>
        ))}

        {/* Inner industry dots */}
        {DOTS.map((d, i) => (
          <g key={`dt-${i}`}
            style={{
              animation: `ha-dot-pop 0.4s ${0.8 + i * 0.12}s ease forwards, ${i % 2 === 0 ? "ha-float-a" : "ha-float-b"} ${4.5 + i * 0.5}s ${i * 0.2}s ease-in-out infinite`,
              opacity: 0,
            }}>
            <circle cx={d.x} cy={d.y} r="17" fill={d.color} opacity="0.06" />
            <circle cx={d.x} cy={d.y} r="6"  fill={d.color} opacity="0.9"  filter="url(#hb-glow-sm)" />
            <text x={d.x} y={d.y - 12}
              textAnchor="middle" fill={d.color} fontSize="10" fontWeight="700" opacity="0.9"
              fontFamily="system-ui, sans-serif">{d.label}</text>
          </g>
        ))}

        {/* Product cards */}
        {PRODUCTS.map((p, i) => {
          const tx = p.x - 90;
          const ty = p.y - 52;
          return (
            <g key={`cd-${i}`}
              style={{
                animation: `ha-fade-in 0.5s ${p.delay} ease forwards, ${p.floatKf} ${p.floatDur} ${p.delay} ease-in-out infinite`,
                opacity: 0,
              }}>
              {/* Outer glow */}
              <rect x={tx - 4} y={ty - 4} width="188" height="112" rx="16" fill={p.color} fillOpacity="0.07" />
              {/* Card body */}
              <rect x={tx} y={ty} width="180" height="104" rx="13"
                fill="#060c28" fillOpacity="0.95"
                stroke={p.color} strokeWidth="1.2" strokeOpacity="0.45" />
              {/* Left accent bar */}
              <rect x={tx} y={ty} width="5" height="104" rx="2.5" fill={p.color} fillOpacity="0.95" />
              {/* Icon badge */}
              <rect x={tx + 13} y={ty + 14} width="30" height="30" rx="8" fill={p.color} fillOpacity="0.2" />
              <g transform={`translate(${tx + 16}, ${ty + 17}) scale(0.88)`}>
                <ProdIcon type={p.icon} color={p.color} />
              </g>
              {/* Product name */}
              <text x={tx + 52} y={ty + 28}
                fill="white" fontSize="13.5" fontWeight="900"
                fontFamily="system-ui, sans-serif">{p.name}</text>
              {/* Tag line */}
              <text x={tx + 52} y={ty + 42}
                fill={p.color} fontSize="9.5" fontWeight="700" opacity="0.9"
                fontFamily="system-ui, sans-serif">{p.tag}</text>
              {/* Feature 1 */}
              <text x={tx + 13} y={ty + 61}
                fill="#94a3b8" fontSize="10.5"
                fontFamily="system-ui, sans-serif">{p.feat1}</text>
              {/* Feature 2 */}
              <text x={tx + 13} y={ty + 75}
                fill="#94a3b8" fontSize="10.5"
                fontFamily="system-ui, sans-serif">{p.feat2}</text>
              {/* Badge pill (if any) */}
              {p.badge && (
                <g className="ha-badge">
                  <rect x={tx + 13} y={ty + 84} width={p.badge.length * 7 + 12} height="14" rx="7"
                    fill={p.color} fillOpacity="0.2" stroke={p.color} strokeWidth="0.8" strokeOpacity="0.6" />
                  <text x={tx + 19} y={ty + 94}
                    fill={p.color} fontSize="9" fontWeight="700"
                    fontFamily="system-ui, sans-serif">{p.badge}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Center hub */}
        <circle cx={CX} cy={CY} r="65" fill="#3b82f6" opacity="0.04" />
        <circle cx={CX} cy={CY} r="48"
          fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.35"
          filter="url(#hb-glow-sm)" />
        <circle cx={CX} cy={CY} r="38"
          fill="url(#hb-cg)" filter="url(#hb-glow-lg)"
          className="ha-center" />
        <circle cx={CX} cy={CY} r="28" fill="url(#hb-cg)" />
        <text x={CX} y={CY - 4}
          textAnchor="middle" fill="white" fontSize="11" fontWeight="900"
          fontFamily="system-ui, sans-serif">Rave</text>
        <text x={CX} y={CY + 10}
          textAnchor="middle" fill="white" fontSize="11" fontWeight="900"
          fontFamily="system-ui, sans-serif">Soft</text>
        <text x={CX} y={CY + 66}
          textAnchor="middle" fill="#475569" fontSize="10" fontWeight="500"
          fontFamily="system-ui, sans-serif">6 Products · 54 Countries</text>
      </svg>
    </div>
  );
}
