import { useEffect, useState } from "react";

interface Props {
  online: boolean;
  pos: [number, number];
  devices: number;
  sound: boolean;
}

export function SystemStatusBar({ online, pos, devices, sound }: Props) {
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    setChecking(true);
    const t = setTimeout(() => setChecking(false), 600);
    return () => clearTimeout(t);
  }, [online]);

  const dotColor = online ? "#22c55e" : checking ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative z-[1000] flex h-9 items-center gap-4 border-b border-glass-border bg-white/[0.02] px-4 text-[11px] tabular text-text-secondary">
      <div className="flex items-center gap-1.5">
        <span>📡 Backend:</span>
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: dotColor,
            animation: online ? "liveDot 1.6s ease-in-out infinite" : undefined,
          }}
        />
        <span style={{ color: dotColor }}>{online ? "Online" : checking ? "Checking" : "Offline"}</span>
      </div>
      <span className="text-text-muted">·</span>
      <div>📍 {pos[0].toFixed(4)}, {pos[1].toFixed(4)}</div>
      <span className="text-text-muted">·</span>
      <div>⚡ Mesh: <span className="text-text-primary">{devices}</span> devices</div>
      <span className="text-text-muted hidden sm:inline">·</span>
      <div className="hidden sm:block">🔊 Sound: {sound ? "ON" : "OFF"}</div>
    </div>
  );
}
