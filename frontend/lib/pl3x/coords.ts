// Pl3xMap 좌표/타일 계약 (순수 수학, leaflet 의존 없음 — 서버/클라 양쪽에서 import 가능).
// CRS 생성(L.CRS.Simple + transformation(1,0,1,0))은 leaflet이 필요하므로 클라 지도 컴포넌트에서.
// 근거: reference/Pl3xMap/webmap ReversedZoomTileLayer + Util.toLatLng. (SPEC.md)

import type { WorldSettings } from "./types";

/** 블록 1칸당 LatLng 스케일: 1 / 2^maxZoomOut */
export function scale(maxOut: number): number {
  return 1 / Math.pow(2, maxOut);
}

/** 블록좌표 → Leaflet LatLng 튜플 [lat, lng] = [z*scale, x*scale] */
export function blockToLatLng(x: number, z: number, maxOut: number): [number, number] {
  const s = scale(maxOut);
  return [z * s, x * s];
}

/** 블록 중앙 정렬(+0.5) LatLng — 마커 배치용 */
export function blockToCenteredLatLng(
  x: number,
  z: number,
  maxOut: number,
): [number, number] {
  return blockToLatLng(x + 0.5, z + 0.5, maxOut);
}

/** Leaflet LatLng → 블록좌표 */
export function latLngToBlock(
  lat: number,
  lng: number,
  maxOut: number,
): { x: number; z: number } {
  const s = scale(maxOut);
  return { x: lng / s, z: lat / s };
}

/** ReversedZoomTileLayer 옵션 (react-leaflet TileLayer에 그대로 전달) */
export function tileLayerOptions(zoom: WorldSettings["zoom"]) {
  return {
    tileSize: 512, // region = 512x512 블록
    noWrap: true,
    minNativeZoom: 0, // 항상 0
    maxNativeZoom: zoom.maxOut,
    maxZoom: zoom.maxOut + zoom.maxIn, // stretch zoom-in
    zoomOffset: -zoom.maxIn,
  } as const;
}

/**
 * 타일 URL 템플릿: tiles/{world}/{z}/{renderer}/{x}_{y}.{format}
 * z가 renderer보다 앞이라는 점 주의. leaflet 플레이스홀더 {z}/{x}/{y} 유지.
 */
export function tileUrlTemplate(
  world: string,
  rendererLabel: string,
  format: string,
): string {
  return `/tiles/${world}/{z}/${rendererLabel}/{x}_{y}.${format}`;
}

/** 역순 줌: leaflet 줌 → 타일 URL의 z. urlZoom = (maxZoom - zoom) + zoomOffset */
export function urlZoom(
  leafletZoom: number,
  zoom: WorldSettings["zoom"],
): number {
  const maxZoom = zoom.maxOut + zoom.maxIn;
  const zoomOffset = -zoom.maxIn;
  return maxZoom - leafletZoom + zoomOffset;
}
