import { useEffect } from "react";
import { createPortal } from "react-dom";

export interface DemoLog {
  id: string;
  status: "accepted" | "blocked";
  text: string;
  reason?: string;
  type?: string;
}

interface Props {
  open: boolean;
  logs: DemoLog[];
  onClose: () => void;
}

export function DemoVisualizer({ open, logs, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const accepted = logs.filter((l) => l.status === "accepted").length;
  const blocked = logs.filter((l) => l.status === "blocked").length;

  return createPortal(
    <div
      className="fixed top-16 left-4 z-[9999] w-[320px] max-w-[calc(100vw-2rem)] max-h-[min(56vh,460px)] overflow-hidden rounded-2xl glass-strong border border-glass-border-bright shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
      style={{ animation: "slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative inline-block h-2 w-2 rounded-full bg-emergency">
            <span className="absolute inset-0 rounded-full bg-emergency" style={{ animation: "liveDot 1.6s ease-in-out infinite" }} />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest">🎬 Spam Filter — Live</span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
      </div>
      <div className="scroll-thin max-h-[40vh] overflow-y-auto p-2">
        {logs.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-text-muted">Awaiting events…</div>
        )}
        {logs.map((l) => (
          <div
            key={l.id}
            className="mb-1.5 rounded-lg border-l-[3px] px-3 py-2"
            style={{
              borderColor: l.status === "accepted" ? "#22c55e" : "#ef4444",
              background:
                l.status === "accepted" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              animation:
                l.status === "blocked"
                  ? "slideInRight 0.35s ease-out, shake 0.5s ease-in-out 0.2s"
                  : "slideInRight 0.35s ease-out",
            }}
          >
            <div className="flex items-start gap-2">
              <span
                className="text-base"
                style={{
                  animation:
                    l.status === "accepted"
                      ? "bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)"
                      : undefined,
                }}
              >
                {l.status === "accepted" ? "✅" : "🚫"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-text-primary">{l.text}</div>
                <div
                  className="mt-0.5 text-[10px] uppercase tracking-widest"
                  style={{ color: l.status === "accepted" ? "#86efac" : "#fca5a5" }}
                >
                  {l.status === "accepted" ? l.type ?? "incident" : l.reason ?? "filtered"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {logs.length > 0 && (
        <div className="border-t border-glass-border bg-glass px-4 py-2 text-center text-[11px] tabular text-text-secondary">
          ✅ <span className="text-safe font-bold">{accepted}</span> accepted ·
          🚫 <span className="text-emergency font-bold ml-1">{blocked}</span> blocked
        </div>
      )}
    </div>,
    document.body
  );
}
