"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer } from "react-leaflet";
import { ReversedZoomTileLayer } from "./ReversedZoomTileLayer";
import { PlayersLayer } from "./PlayersLayer";
import { MapBounds } from "./MapBounds";
import { InitialView } from "./InitialView";
import { usePlayerStream } from "@/hooks/usePlayerStream";
import { usePlayerMarkers } from "@/hooks/usePlayerMarkers";
import { useMapStore } from "@/lib/store/map";
import { blockToLatLng, tileLayerOptions, tileUrlTemplate } from "@/lib/pl3x/coords";
import type { GlobalSettings, WorldSettings } from "@/lib/pl3x/types";

// Pl3xMap 커스텀 CRS: Simple + y축 안 뒤집는 transformation(1,0,1,0)
const pl3xCRS = L.Util.extend(L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
});

// native maxOut 아래 추가 축소 허용폭 (MapBounds가 실제 floor를 "전체 보기" 줌으로 조임).
// 타일 그리드는 maxNativeZoom 고정이라 축소해도 요청 수는 안 늘어남.
const EXTRA_ZOOM_OUT = 8;


export interface MapViewProps {
  global: GlobalSettings;
  world: WorldSettings;
  worldName: string;
  renderer: string;
  /** 월드 재진입 시 복원할 뷰 (없으면 월드 기본 center/zoom) */
  initialCenter?: [number, number];
  initialZoom?: number;
  /** 저장된 뷰가 없을 때(첫 진입) 전체보기로 시작 */
  fitOnLoad?: boolean;
}

export function MapView({
  global,
  world,
  worldName,
  renderer,
  initialCenter,
  initialZoom,
  fitOnLoad,
}: MapViewProps) {
  usePlayerStream();
  usePlayerMarkers(worldName);
  const opts = tileLayerOptions(world.zoom);
  const center =
    initialCenter ??
    blockToLatLng(world.center.x, world.center.z, world.zoom.maxOut);
  const initZoom = initialZoom ?? world.zoom.maxOut - world.zoom.default;

  return (
    <MapContainer
      ref={(m) => useMapStore.getState().setMap(m ?? null)}
      crs={pl3xCRS}
      center={center}
      zoom={initZoom}
      minZoom={-EXTRA_ZOOM_OUT}
      maxZoom={opts.maxZoom}
      zoomSnap={global.zoom.snap}
      zoomDelta={global.zoom.delta}
      wheelPxPerZoomLevel={global.zoom.wheel}
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
        minZoom={-EXTRA_ZOOM_OUT}
        maxZoom={opts.maxZoom}
        zoomOffset={opts.zoomOffset}
        keepBuffer={1}
      />
      <InitialView center={center} zoom={initZoom} minZoom={-EXTRA_ZOOM_OUT} />
      <MapBounds
        worldName={worldName}
        maxOut={world.zoom.maxOut}
        fitOnLoad={fitOnLoad}
      />
      <PlayersLayer worldName={worldName} maxOut={world.zoom.maxOut} />
    </MapContainer>
  );
}
