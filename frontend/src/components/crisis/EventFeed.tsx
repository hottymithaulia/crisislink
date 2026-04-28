import { type CrisisEvent, TYPE_EMOJI, timeAgo, distanceKm } from "@/lib/api";

interface Props {
  events: CrisisEvent[];
  loading: boolean;
  userPos: [number, number];
  votedConfirm: Set<string>;
  votedFake: Set<string>;
  onConfirm: (id: string) => void;
  onFake: (id: string) => void;
}

const URGENCY_BORDER: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#64748b",
};

const URGENCY_BADGE: Record<string, string> = {
  critical: "bg-emergency/20 text-red-300 border-emergency/40",
  high: "bg-warn/20 text-amber-300 border-warn/40",
  medium: "bg-info/20 text-blue-300 border-info/40",
  low: "bg-white/10 text-slate-300 border-white/20",
};

function Skeleton() {
  return (
    <div className="m-3 h-[120px] rounded-2xl shimmer" />
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative mb-6 h-32 w-32">
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute inset-3 rounded-full border border-white/5" />
        <div className="absolute inset-6 rounded-full border border-white/5" />
        <div
          className="absolute inset-0 origin-center"
          style={{ animation: "radarSweep 3s linear infinite" }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(34,197,94,0.4) 60deg, transparent 60deg)",
              clipPath: "polygon(0 0, 100% 0, 0 100%)",
            }}
          />
        </div>
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-safe shadow-[0_0_20px_rgba(34,197,94,0.8)]" />
      </div>
      <div className="text-2xl">🛡️</div>
      <div className="mt-2 text-sm font-semibold text-text-primary">No incidents nearby</div>
      <div className="mt-1 text-xs text-text-secondary">You're safe. Stay alert.</div>
    </div>
  );
}

export function EventFeed({
  events,
  loading,
  userPos,
  votedConfirm,
  votedFake,
  onConfirm,
  onFake,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📍</span>
          <span className="text-sm font-semibold tracking-wide">Nearby Incidents</span>
        </div>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold tabular text-primary">
          {events.length}
        </span>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto pb-24">
        {loading && events.length === 0 && (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        )}
        {!loading && events.length === 0 && <EmptyState />}
        {events.map((e) => {
          const total = e.confirmations + e.fakes;
          const trust = total > 0 ? (e.confirmations / total) * 100 : 50;
          const km = distanceKm(userPos, [e.lat, e.lon]);
          const voted = votedConfirm.has(e.id) || votedFake.has(e.id);
          return (
            <div
              key={e.id}
              className="m-3 rounded-2xl border border-glass-border bg-glass p-4 hover:bg-glass-hover transition-colors"
              style={{
                borderLeft: `4px solid ${URGENCY_BORDER[e.urgency]}`,
                animation: "slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${URGENCY_BADGE[e.urgency]}`}
                >
                  {TYPE_EMOJI[e.type]} {e.urgency}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-text-muted tabular">
                  {timeAgo(e.timestamp)}
                </span>
              </div>
              <div className="mb-3 text-sm font-medium leading-relaxed text-text-primary">
                {e.text}
              </div>
              {e.audio_base64 && (
                <div className="mb-3 rounded-lg bg-black/20 p-2 border border-white/5">
                  <div className="text-[10px] mb-1 font-semibold uppercase tracking-wider text-text-muted">
                    🗣️ Original Voice Note ({e.lang.toUpperCase()})
                  </div>
                  <audio 
                    src={e.audio_base64} 
                    controls 
                    className="h-8 w-full outline-none opacity-80 filter invert sepia hue-rotate-180" 
                  />
                </div>
              )}
              <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${trust}%`,
                    background:
                      "linear-gradient(90deg, #ef4444, #f59e0b 40%, #22c55e)",
                  }}
                />
              </div>
              <div className="mb-3 flex items-center gap-3 text-[11px] tabular text-text-secondary">
                <span className="text-safe">✓ {e.confirmations}</span>
                <span className="text-emergency">✗ {e.fakes}</span>
                <span>📍 {km.toFixed(1)} km</span>
                {e.unverified && (
                  <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-text-muted">
                    bronze
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={voted}
                  onClick={() => onConfirm(e.id)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                    votedConfirm.has(e.id)
                      ? "border-safe/40 bg-safe/20 text-safe"
                      : "border-glass-border bg-glass text-text-secondary hover:bg-safe/10 hover:text-safe hover:border-safe/40"
                  } disabled:cursor-not-allowed`}
                >
                  {votedConfirm.has(e.id) ? "✓ Confirmed" : "Confirm"}
                </button>
                <button
                  disabled={voted}
                  onClick={() => onFake(e.id)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                    votedFake.has(e.id)
                      ? "border-emergency/40 bg-emergency/20 text-emergency"
                      : "border-glass-border bg-glass text-text-secondary hover:bg-emergency/10 hover:text-emergency hover:border-emergency/40"
                  } disabled:cursor-not-allowed`}
                >
                  {votedFake.has(e.id) ? "✗ Reported" : "Fake"}
                </button>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lon}`, "_blank")}
                  className="flex-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary transition hover:bg-primary/20 hover:border-primary/50"
                >
                  🗺️ Going
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
