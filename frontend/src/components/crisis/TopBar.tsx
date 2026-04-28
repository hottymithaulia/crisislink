import { useEffect, useRef, useState } from "react";

interface Props {
  events: number;
  confirmed: number;
  devices: number;
  sound: boolean;
  loadingDemo: boolean;
  onToggleSound: () => void;
  onLoadDemo: () => void;
  onShare: (rect: DOMRect) => void;
}

export function TopBar({
  events,
  confirmed,
  devices,
  sound,
  loadingDemo,
  onToggleSound,
  onLoadDemo,
  onShare,
}: Props) {
  const shareRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative z-[1000] flex h-12 items-center justify-between border-b border-glass-border glass-strong px-4">
      <div className="flex items-center gap-3">
        <img
          src="https://github.com/user-attachments/assets/d0c6ee8f-0eb5-4947-bf47-d48ffc3d844e"
          alt="CrisisLink"
          className="h-8 w-8 object-contain"
        />
        <div className="leading-none">
          <div className="text-[15px] font-extrabold tracking-tight">CrisisLink</div>
          <div className="hidden sm:block text-[9px] uppercase tracking-widest text-text-muted">
            Hyperlocal · Voice-first · Offline-capable
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Pill>
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-safe">
            <span className="absolute inset-0 rounded-full bg-safe" style={{ animation: "liveDot 1.6s ease-in-out infinite" }} />
          </span>
          <span className="tabular">{events}</span>
          <span className="text-text-muted">events</span>
        </Pill>
        <Pill>
          <span className="text-safe">✓</span>
          <span className="tabular">{confirmed}</span>
          <span className="text-text-muted">confirmed</span>
        </Pill>
        <Pill>
          <span>📡</span>
          <span className="tabular">{devices}</span>
          <span className="text-text-muted">devices</span>
        </Pill>
      </div>

      <div className="flex items-center gap-2">
        <IconBtn onClick={onToggleSound} title={sound ? "Mute" : "Unmute"}>
          {sound ? "🔔" : "🔕"}
        </IconBtn>
        <button
          onClick={onLoadDemo}
          disabled={loadingDemo}
          className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/25 disabled:opacity-60"
        >
          {loadingDemo ? "⏳ Loading" : "🎬 Load Demo"}
        </button>
        <button
          ref={shareRef}
          onClick={() => shareRef.current && onShare(shareRef.current.getBoundingClientRect())}
          className="rounded-lg border border-glass-border bg-glass px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-text-primary hover:bg-glass-hover"
        >
          📱 Share
        </button>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] font-semibold">
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass-border bg-glass hover:bg-glass-hover"
    >
      {children}
    </button>
  );
}
