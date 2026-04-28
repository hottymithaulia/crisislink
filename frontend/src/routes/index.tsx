import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "@/components/crisis/TopBar";
import { SystemStatusBar } from "@/components/crisis/SystemStatusBar";
import { CrisisMap } from "@/components/crisis/CrisisMap";
import { EventFeed } from "@/components/crisis/EventFeed";
import { VoiceFAB } from "@/components/crisis/VoiceFAB";
import { DemoVisualizer, type DemoLog } from "@/components/crisis/DemoVisualizer";
import { QRSharePortal } from "@/components/crisis/QRSharePortal";
import { BottomSheet } from "@/components/crisis/BottomSheet";
import { ToastHost, pushToast } from "@/components/crisis/ToastHost";
import { api, getUserId, type CrisisEvent } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CrisisLink — Real-time Hyperlocal Emergency Reporting" },
      {
        name: "description",
        content:
          "Voice-first, offline-capable, hyperlocal emergency reporting. See incidents on a live map and report what's happening around you in seconds.",
      },
      { property: "og:title", content: "CrisisLink — Crisis Operations Center" },
      { property: "og:description", content: "Live, mesh-aware, voice-first emergency reporting." },
    ],
  }),
  component: Index,
});

const DEFAULT_CENTER: [number, number] = [23.2599, 77.4126]; // Bhopal

function Index() {
  const userId = useMemo(() => getUserId(), []);
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [pos, setPos] = useState<[number, number]>(DEFAULT_CENTER);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [devices, setDevices] = useState(1);
  const [sound, setSound] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [showFeed, setShowFeed] = useState(true);
  const [demoLogs, setDemoLogs] = useState<DemoLog[]>([]);
  const [shareAnchor, setShareAnchor] = useState<DOMRect | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [meshOriginIds, setMeshOriginIds] = useState<string[]>([]);
  const [votedConfirm, setVotedConfirm] = useState<Set<string>>(new Set());
  const [votedFake, setVotedFake] = useState<Set<string>>(new Set());
  const [offlineBanner, setOfflineBanner] = useState(false);
  const beepRef = useRef<HTMLAudioElement | null>(null);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // Initial fetch + health
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.nearby(pos[0], pos[1], 25);
        if (mounted) setEvents(r.data?.events || []);
        setOnline(true);
      } catch {
        setOnline(false);
        setOfflineBanner(true);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pos[0], pos[1]]);

  // Socket
  useEffect(() => {
    const s = getSocket();
    const onConnect = () => {
      setOnline(true);
      setOfflineBanner(false);
      s.emit("requestNearbyEvents", { lat: pos[0], lon: pos[1], radius: 25 });
    };
    const onDisconnect = () => {
      setOnline(false);
      setOfflineBanner(true);
    };
    const onNew = (data: any) => {
      const ev: CrisisEvent = data.event || data;
      if (!ev?.id) return;
      setEvents((prev) => (prev.some((p) => p.id === ev.id) ? prev : [ev, ...prev]));
      setMeshOriginIds((ids) => [...ids, ev.id]);
      setTimeout(() => setMeshOriginIds((ids) => ids.filter((x) => x !== ev.id)), 4000);
      if (sound) playBeep();
      // If this is a seed event, also add it to the demo log as accepted
      if (data.source === "seed") {
        setDemoLogs((l) => [
          ...l,
          {
            id: ev.id,
            status: "accepted",
            text: ev.text || "(no text)",
            type: ev.type,
          },
        ]);
      }
    };
    const onUpdated = (data: any) => {
      const ev: CrisisEvent = data.event || data;
      if (!ev?.id) return;
      setEvents((prev) => prev.map((p) => (p.id === ev.id ? { ...p, ...ev } : p)));
    };
    const onSeedBlocked = (d: any) => {
      setDemoLogs((l) => [
        ...l,
        {
          id: Math.random().toString(36).slice(2),
          status: "blocked",
          text: d.text || "(empty)",
          reason: d.reason || "filtered",
        },
      ]);
    };
    const onConnCount = (d: any) => setDevices(d.connectedDevices ?? 1);
    const onInitial = (d: any) => {
      if (Array.isArray(d?.events)) setEvents(d.events);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("new_event", onNew);
    s.on("event_updated", onUpdated);
    s.on("seed_event_blocked", onSeedBlocked);
    s.on("connectionCountUpdate", onConnCount);
    s.on("initialEvents", onInitial);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("new_event", onNew);
      s.off("event_updated", onUpdated);
      s.off("seed_event_blocked", onSeedBlocked);
      s.off("connectionCountUpdate", onConnCount);
      s.off("initialEvents", onInitial);
    };
  }, [pos[0], pos[1], sound]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 120);
    } catch {}
  };

  const handlePost = async (text: string, lang: string, audioBase64?: string) => {
    try {
      const r = await api.postEvent({ text, lat: pos[0], lon: pos[1], user_id: userId, lang, audio_base64: audioBase64 });
      if (r.success && r.data?.event) {
        pushToast({ type: "success", text: "Incident posted to the mesh" });
      } else {
        pushToast({ type: "error", text: `Blocked: ${r.reason || "spam filter"}` });
      }
    } catch (e: any) {
      if (e.response?.status === 422) {
        pushToast({ type: "error", text: `Blocked by AI: ${e.response.data?.error || "Spam detected"}` });
      } else {
        pushToast({ type: "error", text: "Failed to post — backend unreachable" });
      }
    }
  };

  const handleConfirm = async (id: string) => {
    setVotedConfirm((s) => new Set(s).add(id));
    setEvents((prev) =>
      prev.map((p) => (p.id === id ? { ...p, confirmations: p.confirmations + 1 } : p))
    );
    try {
      await api.confirm(id, userId);
    } catch {}
  };
  const handleFake = async (id: string) => {
    setVotedFake((s) => new Set(s).add(id));
    setEvents((prev) => prev.map((p) => (p.id === id ? { ...p, fakes: p.fakes + 1 } : p)));
    try {
      await api.fake(id, userId);
    } catch {}
  };

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    setDemoOpen(true);
    setDemoLogs([]);
    try {
      await api.seed();
      pushToast({ type: "info", text: "Demo seed dispatched" });
    } catch {
      pushToast({ type: "error", text: "Demo seed failed (backend offline?)" });
    } finally {
      setTimeout(() => setLoadingDemo(false), 800);
    }
  };

  const confirmedCount = events.filter((e) => e.confirmations > 0).length;

  return (
    <div className="flex h-screen flex-col bg-surface text-text-primary">
      <TopBar
        events={events.length}
        confirmed={confirmedCount}
        devices={devices}
        sound={sound}
        loadingDemo={loadingDemo}
        onToggleSound={() => setSound((s) => !s)}
        onLoadDemo={handleLoadDemo}
        onShare={(rect) => {
          setShareAnchor(rect);
          setShareOpen(true);
        }}
      />
      <SystemStatusBar online={online} pos={pos} devices={devices} sound={sound} />

      {offlineBanner && (
        <div className="flex items-center justify-center gap-2 border-b border-emergency/40 bg-emergency/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-300">
          ⚠️ Connection lost — reconnecting…
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1 relative isolate" style={{ zIndex: 0 }}>
          <CrisisMap
            events={events}
            center={pos}
            meshOriginIds={meshOriginIds}
            onConfirm={handleConfirm}
            onFake={handleFake}
            votedConfirm={votedConfirm}
            votedFake={votedFake}
          />
        </div>
        {showFeed && (
          <aside className="relative z-[500] hidden md:block w-[340px] border-l border-glass-border bg-void/60 backdrop-blur-md transition-all">
            <EventFeed
              events={events}
              loading={loading}
              userPos={pos}
              votedConfirm={votedConfirm}
              votedFake={votedFake}
              onConfirm={handleConfirm}
              onFake={handleFake}
            />
          </aside>
        )}
      </div>

      {showFeed && (
        <BottomSheet count={events.length}>
          <EventFeed
            events={events}
            loading={loading}
            userPos={pos}
            votedConfirm={votedConfirm}
            votedFake={votedFake}
            onConfirm={handleConfirm}
            onFake={handleFake}
          />
        </BottomSheet>
      )}

      {/* Feed Toggle Button */}
      <button
        onClick={() => setShowFeed((s) => !s)}
        className="fixed bottom-6 right-4 z-[1050] flex h-12 w-12 items-center justify-center rounded-full border border-glass-border bg-glass text-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:bg-glass-hover hover:scale-110"
        title="Toggle Incidents Feed"
      >
        {showFeed ? "👁️‍🗨️" : "📋"}
      </button>

      <VoiceFAB onSubmit={handlePost} />
      <DemoVisualizer open={demoOpen} logs={demoLogs} onClose={() => setDemoOpen(false)} />
      <QRSharePortal
        open={shareOpen}
        anchor={shareAnchor}
        onClose={() => setShareOpen(false)}
      />
      <ToastHost />
    </div>
  );
}
