import { lazy, Suspense, useEffect, useState } from "react";
import { type CrisisEvent } from "@/lib/api";

interface Props {
  events: CrisisEvent[];
  center: [number, number];
  meshOriginIds: string[];
  onConfirm: (id: string) => void;
  onFake: (id: string) => void;
  votedConfirm: Set<string>;
  votedFake: Set<string>;
}

const CrisisMapClient = lazy(() =>
  import("./CrisisMapClient").then((m) => ({ default: m.CrisisMapClient }))
);

export function CrisisMap(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-void text-[11px] uppercase tracking-widest text-text-muted">
        Initializing map…
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-void text-[11px] uppercase tracking-widest text-text-muted">
          Loading map…
        </div>
      }
    >
      <CrisisMapClient {...props} />
    </Suspense>
  );
}
