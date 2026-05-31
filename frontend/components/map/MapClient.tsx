"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { WorldSelector } from "@/components/WorldSelector";
import { ZoomControl } from "@/components/overlay/ZoomControl";
import { CoordsBox } from "@/components/overlay/CoordsBox";
import { PlayersPanel } from "@/components/overlay/PlayersPanel";
import { ServerInfo } from "@/components/overlay/ServerInfo";
import { blockToLatLng } from "@/lib/pl3x/coords";
import { useMapStore } from "@/lib/store/map";
import { useFollowStore } from "@/lib/store/follow";
import { usePlayersStore } from "@/lib/store/players";
import type { GlobalSettings, WorldSettings } from "@/lib/pl3x/types";

// leaflet은 window를 참조하므로 SSR 비활성화로 클라에서만 로드
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-screen items-center justify-center bg-[#0a0a0a] text-sm text-neutral-400">
      지도 불러오는 중…
    </div>
  ),
});

export interface MapClientProps {
  global: GlobalSettings;
  world: WorldSettings;
  worldName: string;
  renderer: string;
}

export function MapClient({
  global,
  world: initialWorld,
  worldName: initialWorldName,
  renderer: initialRenderer,
}: MapClientProps) {
  const [worldName, setWorldName] = useState(initialWorldName);
  const [renderer, setRenderer] = useState(initialRenderer);
  const [worldSettings, setWorldSettings] = useState(initialWorld);
  const [busy, setBusy] = useState(false);

  const worlds = global.worldSettings;

  // 월드별 마지막 뷰(center/zoom) 기억 → 재진입 시 복원
  const viewMemory = useRef<
    Record<string, { center: [number, number]; zoom: number }>
  >({});

  function captureView() {
    const map = useMapStore.getState().map;
    if (!map) return;
    const c = map.getCenter();
    viewMemory.current[worldName] = {
      center: [c.lat, c.lng],
      zoom: map.getZoom(),
    };
  }

  async function changeWorld(name: string) {
    if (name === worldName || busy) return;
    const entry = worlds.find((w) => w.name === name);
    if (!entry) return;
    captureView(); // 떠나는 월드의 현재 뷰 저장
    setBusy(true);
    try {
      const ws: WorldSettings = await fetch(`/tiles/${name}/settings.json`, {
        cache: "no-store",
      }).then((r) => r.json());
      setWorldSettings(ws);
      setWorldName(name);
      setRenderer(entry.renderers[0]?.label ?? renderer);
    } catch {
      // 전환 실패 — 현재 월드 유지
    } finally {
      setBusy(false);
    }
  }

  function changeRenderer(label: string) {
    captureView(); // 렌더러 변경도 리마운트되므로 뷰 보존
    setRenderer(label);
  }

  // 다른 월드의 플레이어를 추적하면 자동으로 그 월드로 전환
  const followUuid = useFollowStore((s) => s.followUuid);
  const players = usePlayersStore((s) => s.players);
  useEffect(() => {
    if (!followUuid) return;
    const p = players[followUuid];
    if (p?.world && p.world !== worldName) void changeWorld(p.world);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUuid, players, worldName]);

  const maxOut = worldSettings.zoom.maxOut;
  const resetCenter = blockToLatLng(
    worldSettings.center.x,
    worldSettings.center.z,
    maxOut,
  );
  const savedView = viewMemory.current[worldName];

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      {/* world/renderer 변경 시 key로 MapContainer 리마운트 (zoom/center/타일/스케일 일괄 적용) */}
      <MapView
        key={`${worldName}/${renderer}`}
        global={global}
        world={worldSettings}
        worldName={worldName}
        renderer={renderer}
        initialCenter={savedView?.center}
        initialZoom={savedView?.zoom}
        fitOnLoad={!savedView}
      />
      <WorldSelector
        worlds={worlds}
        worldName={worldName}
        renderer={renderer}
        onWorldChange={changeWorld}
        onRendererChange={changeRenderer}
        busy={busy}
      />
      <ZoomControl center={resetCenter} />
      <PlayersPanel worldName={worldName} maxPlayers={global.maxPlayers} />
      <CoordsBox worldName={worldName} maxOut={maxOut} />
      <ServerInfo />
    </div>
  );
}
