import type { Severity } from "@/lib/types";

const LEVELS: Severity[] = ["critical", "high", "medium", "low", "info"];

const SWATCH: Record<Severity, string> = {
  critical: "var(--sev-critical)",
  high: "var(--sev-high)",
  medium: "var(--sev-medium)",
  low: "var(--sev-low)",
  info: "var(--sky)",
};

export function ScoreRing({ score, band }: { score: number; band: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = circumference * (clamped / 100);
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 108 108" className="h-28 w-28 shrink-0" role="img" aria-label={`Risk score ${score}, ${band}`}>
        <circle cx="54" cy="54" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="54"
          cy="54"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 54 54)"
        />
        <text x="54" y="58" textAnchor="middle" fill="var(--fg)" fontSize="22" fontFamily="Georgia, serif">
          {score}
        </text>
      </svg>
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Latest score</p>
        <p className="mt-1 font-serif text-2xl text-paper">{band}</p>
        <p className="mt-1 text-xs text-muted">Weighted heuristic from the latest completed scan. It is not a certification.</p>
      </div>
    </div>
  );
}

export function SeverityBreakdown({ counts }: { counts: Record<string, number> }) {
  const total = LEVELS.reduce((sum, level) => sum + (counts[level] ?? 0), 0);
  if (total === 0) {
    return <p className="text-sm text-muted">The latest completed scan recorded no findings.</p>;
  }
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-panel" role="img" aria-label="Findings by severity">
        {LEVELS.map((level) => {
          const count = counts[level] ?? 0;
          if (!count) return null;
          return <span key={level} style={{ width: `${(count / total) * 100}%`, background: SWATCH[level] }} />;
        })}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2 capitalize text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: SWATCH[level] }} aria-hidden="true" />
            {level}
            <span className="text-paper">{counts[level] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScoreTrend({ points }: { points: { id: string; score: number; label: string }[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted">Completed scans plot here, oldest to newest, on a 0–100 scale.</p>;
  }
  const width = 360;
  const height = 128;
  const pad = 12;
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : pad + (index / (points.length - 1)) * (width - pad * 2);
    const y = pad + (1 - Math.max(0, Math.min(100, point.score)) / 100) * (height - pad * 2);
    return { ...point, x, y };
  });
  const label = points.map((point) => `${point.label} score ${point.score}`).join(", ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full text-brass" role="img" aria-label={`Score trend: ${label}`}>
      {[25, 50, 75].map((mark) => {
        const y = pad + (1 - mark / 100) * (height - pad * 2);
        return <line key={mark} x1={pad} x2={width - pad} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />;
      })}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={coords.map((point) => `${point.x},${point.y}`).join(" ")}
      />
      {coords.map((point) => (
        <circle key={point.id} cx={point.x} cy={point.y} r="3.5" fill="currentColor">
          <title>{point.label}: {point.score}</title>
        </circle>
      ))}
    </svg>
  );
}
