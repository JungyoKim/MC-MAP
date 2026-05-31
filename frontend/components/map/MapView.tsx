"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer } from "react-leaflet";
import { ReversedZoomTileLayer } from "./ReversedZoomTileLayer";
import { PlayersLayer } from "./PlayersLayer";
import { MapInit } from "./MapInit";
import { usePlayerStream } from "@/hooks/usePlayerStream";
import { usePlayerMarkers } from "@/hooks/usePlayerMarkers";
import { useMapStore } from "@/lib/store/map";
import { blockToLatLng, tileLayerOptions, tileUrlTemplate } from "@/lib/pl3x/coords";
import type { GlobalSettings, WorldSettings } from "@/lib/pl3x/types";

// Pl3xMap 커스텀 CRS: Simple + y축 안 뒤집는 transformation(1,0,1,0)
const pl3xCRS = L.Util.extend(L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
});

export interface MapViewProps {
  global: GlobalSettings;
  world: WorldSettings;
  worldName: string;
  renderer: string;
  /** 월드 재진입 시 복원할 뷰 (없으면 기본) */
  initialCenter?: [number, number];
  initialZoom?: number;
}

export function MapView({
  global,
  world,
  worldName,
  renderer,
  initialCenter,
  initialZoom,
}: MapViewProps) {
  usePlayerStream();
  usePlayerMarkers(worldName);
  const opts = tileLayerOptions(world.zoom);
  const center =
    initialCenter ??
    blockToLatLng(world.center.x, world.center.z, world.zoom.maxOut);
  // 첫 진입은 native 최대 축소(0=개요), 재진입은 저장된 줌.
  // 음수 줌(전체보기)은 모바일 크래시/버벅임 원인이라 쓰지 않음 — 원래 webui처럼 native 범위만.
  const initZoom = initialZoom ?? 0;

  return (
    <MapContainer
      ref={(m) => useMapStore.getState().setMap(m ?? null)}
      crs={pl3xCRS}
      center={center}
      zoom={initZoom}
      minZoom={0}
      maxZoom={opts.maxZoom}
      // 정수 줌(원래 webui 방식) — 분수 줌(0.25)은 핀치/줌마다 타일 재계산해 버벅임
      zoomSnap={1}
      zoomDelta={1}
      zoomControl={false}
      attributionControl={false}
      style={{ height: "100dvh", width: "100vw", background: "#0a0a0a" }}
    >
      <ReversedZoomTileLayer
        url={tileUrlTemplate(worldName, renderer, global.format)}
        tileSize={opts.tileSize}
        noWrap={opts.noWrap}
        minNativeZoom={opts.minNativeZoom}
        maxNativeZoom={opts.maxNativeZoom}
        maxZoom={opts.maxZoom}
        zoomOffset={opts.zoomOffset}
        keepBuffer={2}
      />
      <MapInit />
      <PlayersLayer worldName={worldName} maxOut={world.zoom.maxOut} />
    </MapContainer>
  );
}
