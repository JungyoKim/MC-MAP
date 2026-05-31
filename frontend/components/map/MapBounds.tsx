"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { blockToCenteredLatLng } from "@/lib/pl3x/coords";
import { isIOS } from "@/lib/isIOS";

interface MapBoundsProps {
  worldName: string;
  maxOut: number;
  /** 저장된 뷰 없을 때(첫 진입) 전체보기로 맞춤 */
  fitOnLoad?: boolean;
}

interface Pt {
  x: number;
  z: number;
}

/**
 * World Border 범위로:
 *  1) 타일 요청을 월드 범위로 제한 → 음수 줌(전체보기)에서도 빈 타일 폭증 없이 ~월드 타일만 로드(부드러움)
 *  2) 최소 줌 = 월드 전체가 들어오는 줌(전체보기). iOS 는 음수 줌 크래시라 0 바닥.
 * + mount 시 invalidateSize (월드 전환 후 타일 즉시 로드).
 */
export function MapBounds({ worldName, maxOut, fitOnLoad }: MapBoundsProps) {
  const map = useMap();

  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [map]);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const r = await fetch(
          `/tiles/${worldName}/markers/pl3xmap_worldborder.json`,
          { cache: "no-store" },
        );
        if (!r.ok || aborted) return;
        const data = await r.json();
        const pts: Pt[] = [];
        for (const m of Array.isArray(data) ? data : []) {
          const d = (m?.data ?? {}) as {
            points?: Pt[];
            polylines?: { points: Pt[] }[];
          };
          if (Array.isArray(d.points)) pts.push(...d.points);
          else if (Array.isArray(d.polylines))
            for (const pl of d.polylines) pts.push(...pl.points);
        }
        if (pts.length === 0 || aborted) return;

        let minX = Infinity,
          minZ = Infinity,
          maxX = -Infinity,
          maxZ = -Infinity;
        for (const p of pts) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minZ = Math.min(minZ, p.z);
          maxZ = Math.max(maxZ, p.z);
        }
        const world = L.latLngBounds(
          blockToCenteredLatLng(minX, minZ, maxOut),
          blockToCenteredLatLng(maxX, maxZ, maxOut),
        ).pad(0.05);

        // 1) 타일 요청을 월드로 제한 (음수 줌 빈 타일 폭증 방지)
        map.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) {
            layer.options.bounds = world;
            layer.redraw();
          }
        });

        // 2) 최소 줌 = 전체보기 줌. iOS 는 0 바닥(음수 줌 크래시 회피).
        map.invalidateSize();
        map.setMinZoom(isIOS() ? 0 : -20); // clamp 풀고 fit 계산
        const fit = map.getBoundsZoom(world);
        map.setMinZoom(Math.min(fit, map.getZoom()));

        if (fitOnLoad && !aborted) map.fitBounds(world, { animate: false });
      } catch {
        // worldborder 없으면 native 범위 그대로
      }
    })();
    return () => {
      aborted = true;
    };
  }, [map, worldName, maxOut, fitOnLoad]);

  return null;
}
