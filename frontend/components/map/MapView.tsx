"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer } from "react-leaflet";
import { ReversedZoomTileLayer } from "./ReversedZoomTileLayer";
import { PlayersLayer } from "./PlayersLayer";
import { MapBounds } from "./MapBounds";
import { usePlayerStream } from "@/hooks/usePlayerStream";
import { usePlayerMarkers } from "@/hooks/usePlayerMarkers";
import { useMapStore } from "@/lib/store/map";
import { isIOS } from "@/lib/isIOS";
import { blockToLatLng, tileLayerOptions, tileUrlTemplate } from "@/lib/pl3x/coords";
import type { GlobalSettings, WorldSettings } from "@/lib/pl3x/types";

// Pl3xMap 커스텀 CRS: Simple + y축 안 뒤집는 transformation(1,0,1,0)
const pl3xCRS = L.Util.extend(L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
});

// native(0) 아래 허용 여유. 실제 바닥은 MapBounds가 "전체보기 fit"으로 조임.
const EXTRA_ZOOM_OUT = 8;

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
  // iOS WebKit 은 음수 줌에서 크래시 → 바닥 0. 그 외(데스크탑/Android)는 정수 음수 줌
  // 허용 = 전체보기. 정수 줌(zoomSnap 1) + native 타일이라 부드러움(브라우저 Ctrl+- 원리와 유사).
  // iOS 는 안정성 위해 native(0) 바닥, 그 외(데스크탑/Android)는 전체보기 음수 줌 허용.
  const minZoomFloor = isIOS() ? 0 : -EXTRA_ZOOM_OUT;
  // 첫 줌은 native 0(가벼움). 전체보기는 MapBounds가 타일 bounds 적용 후 fitBounds 로 맞춤.
  const initZoom = initialZoom ?? 0;

  return (
    <MapContainer
      ref={(m) => useMapStore.getState().setMap(m ?? null)}
      crs={pl3xCRS}
      center={center}
      zoom={initZoom}
      minZoom={minZoomFloor}
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
        minZoom={minZoomFloor}
        maxZoom={opts.maxZoom}
        zoomOffset={opts.zoomOffset}
        keepBuffer={2}
      />
      <MapBounds
        worldName={worldName}
        maxOut={world.zoom.maxOut}
        fitOnLoad={initialZoom === undefined}
      />
      <PlayersLayer worldName={worldName} maxOut={world.zoom.maxOut} />
    </MapContainer>
  );
}
