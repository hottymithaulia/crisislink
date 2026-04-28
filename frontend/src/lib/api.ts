export const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:3001";

export function getUserId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("crisislink_user_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem("crisislink_user_id", id);
  }
  return id;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("crisislink_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem("crisislink_device_id", id);
  }
  return id;
}

export type Urgency = "critical" | "high" | "medium" | "low";
export type EventType =
  | "fire" | "accident" | "medical" | "flood" | "police" | "hazmat" | "incident";

export interface CrisisEvent {
  id: string;
  user_id: string;
  type: EventType;
  urgency: Urgency;
  text: string;
  lat: number;
  lon: number;
  timestamp: number;
  confirmations: number;
  fakes: number;
  responders: string[];
  fakers: string[];
  lang: string;
  audio_base64?: string;
  unverified?: boolean;
}

async function safeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  nearby: (lat: number, lon: number, radius = 25) =>
    safeFetch<{ success: boolean; data: { events: CrisisEvent[] } }>(
      `/events/nearby?lat=${lat}&lon=${lon}&radius=${radius}`
    ),
  postEvent: (body: { text: string; lat: number; lon: number; user_id: string; lang: string; audio_base64?: string }) =>
    safeFetch<{ success: boolean; data?: { event: CrisisEvent }; reason?: string }>(
      `/events`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  confirm: (id: string, user_id: string) =>
    safeFetch(`/events/${id}/confirm`, { method: "POST", body: JSON.stringify({ user_id }) }),
  fake: (id: string, user_id: string) =>
    safeFetch(`/events/${id}/fake`, { method: "POST", body: JSON.stringify({ user_id }) }),
  seed: () => safeFetch(`/events/seed`, { method: "POST" }),
  status: () => safeFetch<{ connectedDevices: number; totalEvents: number }>(`/status`),
  health: () => safeFetch<{ status: string }>(`/health`),
};

export const TYPE_EMOJI: Record<EventType, string> = {
  fire: "🔥",
  accident: "🚗",
  medical: "🏥",
  flood: "🌊",
  police: "🚓",
  hazmat: "☣️",
  incident: "⚠️",
};

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
