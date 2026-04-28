import { useEffect, useRef, useState } from "react";

interface Props {
  onSubmit: (text: string, lang: string) => Promise<void> | void;
}

const LANGS = [
  { code: "en-US", label: "EN" },
  { code: "hi-IN", label: "HI" },
  { code: "te-IN", label: "TE" },
  { code: "bn-IN", label: "BN" },
  { code: "ta-IN", label: "TA" },
  { code: "mr-IN", label: "MR" },
  { code: "kn-IN", label: "KN" },
  { code: "gu-IN", label: "GU" },
];

export function VoiceFAB({ onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState("");
  const [lang, setLang] = useState("en-US");
  const [posting, setPosting] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported in this browser. Type your report.");
      return;
    }
    const r = new SR();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (ev: any) => {
      let t = "";
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      setText(t);
    };
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    r.start();
    recognitionRef.current = r;
    setRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await onSubmit(text.trim(), lang.split("-")[0]);
      setText("");
      setOpen(false);
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    return () => recognitionRef.current?.stop?.();
  }, []);

  return (
    <>
      {/* Expand panel */}
      {open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[1100] glass-strong border-t border-glass-border-bright px-4 pb-6 pt-4"
          style={{ animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                Report an Incident
              </div>
              <button
                onClick={() => {
                  stopRecording();
                  setOpen(false);
                }}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wider transition ${
                    lang === l.code
                      ? "bg-primary text-white shadow-[0_0_16px_rgba(99,102,241,0.5)]"
                      : "bg-glass border border-glass-border text-text-secondary hover:bg-glass-hover"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the incident, or hold the mic to speak…"
              className="mb-3 w-full resize-none rounded-xl border border-glass-border bg-void/60 p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              rows={3}
            />

            <div className="flex gap-2">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`flex h-12 w-14 items-center justify-center rounded-xl text-xl transition ${
                  recording
                    ? "bg-emergency text-white shadow-[0_0_24px_rgba(239,68,68,0.6)]"
                    : "bg-glass border border-glass-border text-text-primary hover:bg-glass-hover"
                }`}
              >
                {recording ? "🔴" : "🎙️"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || posting}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(99,102,241,0.5)] transition hover:shadow-[0_12px_32px_rgba(99,102,241,0.7)] disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post Incident"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          if (open && recording) stopRecording();
          setOpen((o) => !o);
        }}
        className={`fixed bottom-[42vh] md:bottom-6 left-1/2 z-[1050] flex h-14 -translate-x-1/2 items-center gap-3 rounded-full px-6 text-sm font-bold text-white shadow-[0_8px_32px_rgba(99,102,241,0.5)] transition ${
          recording
            ? "bg-gradient-to-br from-emergency to-red-700"
            : "bg-gradient-to-br from-primary to-indigo-700 hover:scale-105"
        }`}
        style={{
          animation: recording ? "emergencyPulse 1.4s ease-in-out infinite" : undefined,
        }}
      >
        {recording ? (
          <>
            <span className="flex items-end gap-0.5">
              {[0, 0.1, 0.2, 0.3, 0.4].map((d, i) => (
                <span
                  key={i}
                  className="block w-0.5 rounded-full bg-white"
                  style={{ animation: `waveBar 0.9s ease-in-out infinite`, animationDelay: `${d}s` }}
                />
              ))}
            </span>
            Recording…
          </>
        ) : (
          <>
            <span className="text-lg">🎙️</span>
            Report Incident
          </>
        )}
      </button>
    </>
  );
}
