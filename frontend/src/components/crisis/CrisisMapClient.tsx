import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type CrisisEvent, TYPE_EMOJI, timeAgo } from "@/lib/api";

interface Props {
  events: CrisisEvent[];
  center: [number, number];
  meshOriginIds: string[];
  onConfirm: (id: string) => void;
  onFake: (id: string) => void;
  votedConfirm: Set<string>;
  votedFake: Set<string>;
}

function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function MeshRingsOverlay({ events, originIds }: { events: CrisisEvent[]; originIds: string[] }) {
  const map = useMap();
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    map.on("move zoom", f);
    return () => {
      map.off("move zoom", f);
    };
  }, [map]);

  return (
    <>
      {events
        .filter((e) => originIds.includes(e.id))
        .map((e) => {
          const pt = map.latLngToContainerPoint([e.lat, e.lon]);
          return (
            <div key={e.id} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {[0, 0.6, 1.2].map((delay, i) => (
                <div
                  key={i}
                  className="mesh-ring"
                  style={{
                    left: pt.x - 150,
                    top: pt.y - 150,
                    width: 300,
                    height: 300,
                    borderColor:
                      i === 0
                        ? "rgba(99,102,241,0.7)"
                        : i === 1
                        ? "rgba(99,102,241,0.4)"
                        : "rgba(99,102,241,0.18)",
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>
          );
        })}
    </>
  );
}

export function CrisisMapClient({
  events,
  center,
  meshOriginIds,
  onConfirm,
  onFake,
  votedConfirm,
  votedFake,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const makeIcon = (e: CrisisEvent) => {
    const size = e.urgency === "critical" ? 30 : e.urgency === "high" ? 26 : 22;
    return L.divIcon({
      className: "",
      html: `<div class="crisis-pin ${e.urgency}" style="width:${size}px;height:${size}px;">${TYPE_EMOJI[e.type]}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={13}
        minZoom={2}
        maxZoom={19}
        zoomControl={true}
        className="h-full w-full"
        attributionControl={true}
        worldCopyJump={false}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM &copy; CARTO'
          noWrap={true}
          bounds={[[-85, -180], [85, 180]]}
        />
        <FlyTo center={center} />
        <MeshRingsOverlay events={events} originIds={meshOriginIds} />
        {events.map((e) => (
          <Marker key={e.id} position={[e.lat, e.lon]} icon={makeIcon(e)}>
            <Popup>
              <div className="min-w-[240px]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-lg">{TYPE_EMOJI[e.type]}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{
                      background:
                        e.urgency === "critical"
                          ? "rgba(239,68,68,0.2)"
                          : e.urgency === "high"
                          ? "rgba(245,158,11,0.2)"
                          : "rgba(59,130,246,0.2)",
                      color:
                        e.urgency === "critical"
                          ? "#fca5a5"
                          : e.urgency === "high"
                          ? "#fcd34d"
                          : "#93c5fd",
                    }}
                  >
                    {e.urgency}
                  </span>
                </div>
                <div className="mb-2 text-sm leading-snug">
                  {e.text.length > 110 ? e.text.slice(0, 110) + "…" : e.text}
                </div>
                <div className="mb-3 text-[10px] uppercase tracking-widest opacity-70">
                  {timeAgo(e.timestamp)} · ✓ {e.confirmations} · ✗ {e.fakes}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={votedConfirm.has(e.id) || votedFake.has(e.id)}
                    onClick={() => onConfirm(e.id)}
                    className="flex-1 rounded-md bg-safe/20 px-2 py-1.5 text-xs font-semibold text-safe hover:bg-safe/30 disabled:opacity-50"
                  >
                    {votedConfirm.has(e.id) ? "✓ Confirmed" : "Confirm"}
                  </button>
                  <button
                    disabled={votedConfirm.has(e.id) || votedFake.has(e.id)}
                    onClick={() => onFake(e.id)}
                    className="flex-1 rounded-md bg-emergency/20 px-2 py-1.5 text-xs font-semibold text-emergency hover:bg-emergency/30 disabled:opacity-50"
                  >
                    {votedFake.has(e.id) ? "✗ Reported" : "Fake"}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
