import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";

interface Props {
  open: boolean;
  anchor: DOMRect | null;
  onClose: () => void;
}

export function QRSharePortal({ open, anchor, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState("");
  const url = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: "#0d0d18", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => {});
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-qr-portal]")) onClose();
    };
    setTimeout(() => window.addEventListener("click", handle), 0);
    return () => window.removeEventListener("click", handle);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const top = anchor ? anchor.bottom + 8 : 56;
  const right = anchor ? window.innerWidth - anchor.right : 16;

  return createPortal(
    <div
      data-qr-portal
      className="fixed z-[999999] w-[270px] rounded-2xl border border-glass-border-bright p-5 shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
      style={{
        top,
        right,
        background: "linear-gradient(135deg, #1e1e2e, #16213e)",
      }}
    >
      <div className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-text-primary">
        📡 Scan to Join CrisisLink
      </div>
      <div className="mx-auto mb-3 flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-white p-2">
        {dataUrl ? (
          <img src={dataUrl} alt="QR code" className="h-full w-full" />
        ) : (
          <div className="text-xs text-slate-500">Generating…</div>
        )}
      </div>
      <div className="mb-2 truncate text-center text-[10px] tabular text-text-muted">{url}</div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(url);
        }}
        className="w-full rounded-lg bg-primary/20 border border-primary/40 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/30"
      >
        📋 Copy Link
      </button>
      <div className="mt-2 text-center text-[10px] text-text-muted">
        Works on any phone on this network
      </div>
    </div>,
    document.body
  );
}
