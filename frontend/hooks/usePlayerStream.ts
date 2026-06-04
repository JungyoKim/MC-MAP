"use client";

import { useEffect } from "react";
import { usePlayersStore } from "@/lib/store/players";

/**
 * 온라인 플레이어 "목록"(이름/수) 스트림.
 * 좌표가 제거된 공개 엔드포인트 /api/players 를 폴링한다.
 * (위치/마커는 usePlayerMarkers 가 인증된 /pro 에서만 가져옴)
 * 목록은 입퇴장 시에만 변하므로 3초 폴링으로 충분하고, 서버측 2초 캐시로 백엔드 부하는 묶인다.
 */
export function usePlayerStream(enabled: boolean = true): void {
  const setPlayers = usePlayersStore((s) => s.setPlayers);
  const setConnected = usePlayersStore((s) => s.setConnected);

  useEffect(() => {
    if (!enabled) return; // 패널 미표시 시 데이터 자체를 안 가져옴
    let timer: ReturnType<typeof setInterval> | null = null;
    let aborted = false;

    const poll = async () => {
      try {
        const r = await fetch("/api/players", { cache: "no-store" });
        if (!r.ok) throw new Error(`players ${r.status}`);
        const j = (await r.json()) as { players?: unknown };
        if (aborted) return;
        setPlayers(Array.isArray(j.players) ? j.players : []);
        setConnected(true);
      } catch {
        if (!aborted) setConnected(false);
      }
    };

    void poll();
    timer = setInterval(poll, 3000);

    return () => {
      aborted = true;
      if (timer) clearInterval(timer);
    };
  }, [enabled, setPlayers, setConnected]);
}
