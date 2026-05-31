"use client";

import { useEffect } from "react";
import { usePlayerMarkersStore } from "@/lib/store/playerMarkers";

interface IconMarkerEntry {
  type: string;
  data?: {
    key?: string;
    point?: { x: number; z: number };
    rotationAngle?: number;
  };
}

function parseMarkers(arr: unknown) {
  return (Array.isArray(arr) ? (arr as IconMarkerEntry[]) : [])
    .filter((m) => m.type === "icon" && m.data?.point && m.data.key)
    .map((m) => ({
      uuid: m.data!.key!,
      x: m.data!.point!.x,
      z: m.data!.point!.z,
      yaw: m.data!.rotationAngle ?? 0,
    }));
}

/**
 * 플레이어 위치 + yaw 실시간 스트림.
 * /api/pl3x/sse/{world} 의 "markers" 이벤트(key=pl3xmap_players)를 구독한다.
 * EventSource 가 끊기면 markers JSON 1s 폴링으로 자동 폴백.
 * 부드러움은 PlayersLayer 의 rAF 보간이 담당.
 */
export function usePlayerMarkers(worldName: string): void {
  const setMarkers = usePlayerMarkersStore((s) => s.setMarkers);

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      const poll = async () => {
        try {
          const r = await fetch(
            `/tiles/${worldName}/markers/pl3xmap_players.json`,
            { cache: "no-store" },
          );
          if (r.ok) setMarkers(parseMarkers(await r.json()));
        } catch {
          // network blip — keep trying
        }
      };
      void poll();
      pollTimer = setInterval(poll, 1000);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    es = new EventSource(`/api/pl3x/sse/${worldName}`);
    es.addEventListener("markers", (ev) => {
      stopPolling();
      try {
        const json = JSON.parse((ev as MessageEvent).data) as {
          key?: string;
          markers?: unknown;
        };
        if (json.key === "pl3xmap_players") setMarkers(parseMarkers(json.markers));
      } catch {
        // ignore malformed frame
      }
    });
    es.onerror = () => {
      // EventSource 자동 재연결 + 그 동안 폴백 폴링
      startPolling();
    };

    return () => {
      es?.close();
      stopPolling();
      setMarkers([]);
    };
  }, [worldName, setMarkers]);
}
