import { useEffect, useState } from "react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}

let pushFn: ((t: Omit<Toast, "id">) => void) | null = null;
export function pushToast(t: Omit<Toast, "id">) {
  pushFn?.(t);
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    pushFn = (t) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((s) => [...s, { ...t, id }]);
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4000);
    };
    return () => {
      pushFn = null;
    };
  }, []);

  return (
    <div className="fixed right-4 top-20 z-[9999] flex w-[320px] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl glass-strong"
          style={{
            borderColor:
              t.type === "success"
                ? "rgba(34,197,94,0.4)"
                : t.type === "error"
                ? "rgba(239,68,68,0.4)"
                : "rgba(99,102,241,0.4)",
            color:
              t.type === "success" ? "#86efac" : t.type === "error" ? "#fca5a5" : "#c7d2fe",
            animation: "slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {t.type === "success" ? "✅ " : t.type === "error" ? "🚫 " : "ℹ️ "}
          {t.text}
        </div>
      ))}
    </div>
  );
}
