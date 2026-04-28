import { useEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  count: number;
}

export function BottomSheet({ children, count }: Props) {
  const [expanded, setExpanded] = useState(false);
  const startY = useRef<number | null>(null);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[900] glass-strong border-t border-glass-border-bright transition-[height] duration-300 ease-out md:hidden"
      style={{
        height: expanded ? "75vh" : "38vh",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
    >
      <div
        className="flex flex-col items-center gap-2 py-2 cursor-grab"
        onClick={() => setExpanded((e) => !e)}
        onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (startY.current == null) return;
          const dy = e.changedTouches[0].clientY - startY.current;
          if (dy < -30) setExpanded(true);
          if (dy > 30) setExpanded(false);
          startY.current = null;
        }}
      >
        <div className="h-1 w-10 rounded-full bg-white/30" />
        <div className="text-[10px] uppercase tracking-widest text-text-muted">
          {count} nearby · tap to {expanded ? "collapse" : "expand"}
        </div>
      </div>
      <div className="h-[calc(100%-44px)] overflow-hidden">{children}</div>
    </div>
  );
}
