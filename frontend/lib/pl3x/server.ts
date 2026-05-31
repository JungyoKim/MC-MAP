// 서버 전용 Pl3xMap 백엔드 접근 헬퍼. (Route Handler / 서버 컴포넌트에서 사용)
import "server-only";
import type { GlobalSettings, WorldListEntry, WorldSettings } from "./types";

export const PL3XMAP_BASE_URL =
  process.env.PL3XMAP_BASE_URL ?? "http://10.10.20.10:8080";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PL3XMAP_BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Pl3xMap ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchGlobalSettings(): Promise<GlobalSettings> {
  return getJson<GlobalSettings>("/tiles/settings.json");
}

export function fetchWorldSettings(world: string): Promise<WorldSettings> {
  return getJson<WorldSettings>(`/tiles/${world}/settings.json`);
}

/** order 기준 첫 번째(기본) 월드 */
export function defaultWorld(global: GlobalSettings): WorldListEntry {
  return [...global.worldSettings].sort((a, b) => a.order - b.order)[0];
}
