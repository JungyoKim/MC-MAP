"use client";

import { useEffect } from "react";
import { usePlayersStore } from "@/lib/store/players";

/**
 * 플레이어 실시간 스트림.
 * /api/pl3x/sse 의 "settings" 이벤트(JSON .players)를 구독하고,
 * EventSource 가 끊기면 /tiles/settings.json 1.5s 폴링으로 자동 폴백한다.
 */
export function usePlayerStream(enabled: boolean = true): void {
  const setPlayers = usePlayersStore((s) => s.setPlayers);
  const setConnected = usePlayersStore((s) => s.setConnected);

  useEffect(() => {
    if (!enabled) return; // 공개 라우트: 플레이어 데이터 자체를 안 가져옴
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const applyPlayers = (data: string) => {
      try {
        const json = JSON.parse(data) as { players?: unknown };
        setPlayers(Array.isArray(json.players) ? json.players : []);
      } catch {
        // ignore malformed frame
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      const poll = async () => {
        try {
          const r = await fetch("/tiles/settings.json", { cache: "no-store" });
          if (r.ok) {
            const j = await r.json();
            setPlayers(Array.isArray(j.players) ? j.players : []);
          }
        } catch {
          // network blip — keep trying
        }
      };
      void poll();
      pollTimer = setInterval(poll, 1500);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    es = new EventSource("/api/pl3x/sse");
    es.addEventListener("settings", (ev) => {
      setConnected(true);
      stopPolling();
      applyPlayers((ev as MessageEvent).data);
    });
    es.onopen = () => setConnected(true);
    es.onerror = () => {
      // EventSource 는 자동 재연결하지만, 그 동안 폴백 폴링으로 데이터 유지
      setConnected(false);
      startPolling();
    };

    return () => {
      es?.close();
      stopPolling();
    };
  }, [enabled, setPlayers, setConnected]);
}
