"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { blockToCenteredLatLng } from "@/lib/pl3x/coords";
import { isIOS } from "@/lib/isIOS";

interface MapBoundsProps {
  worldName: string;
  maxOut: number;
  /** 저장된 뷰가 없을 때(첫 진입) 월드 전체가 보이게 맞춤 */
  fitOnLoad?: boolean;
}

interface Pt {
  x: number;
  z: number;
}

/**
 * World Border 범위로 (마커는 안 그리고) 최소 줌만 "월드 전체가 들어오는 줌"으로 설정
 * → 축소 최대 = 한눈에. worldborder 없는 월드는 기본(minZoom 0).
 * (타일 bounds 필터링은 축소 상태 전환 시 검은화면 유발해 제거함.)
 */
export function MapBounds({ worldName, maxOut, fitOnLoad }: MapBoundsProps) {
  const map = useMap();

  // 월드 전환 리마운트 후 컨테이너 크기 재계산 → 타일이 즉시 로드되게 (줌 안 해도)
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
        if (!r.ok || aborted) {
          map.setMinZoom(0);
          return;
        }
        const data = await r.json();
        const pts: Pt[] = [];
        for (const m of Array.isArray(data) ? data : []) {
          const d = (m?.data ?? {}) as { points?: Pt[]; polylines?: { points: Pt[] }[] };
          if (Array.isArray(d.points)) pts.push(...d.points);
          else if (Array.isArray(d.polylines))
            for (const pl of d.polylines) pts.push(...pl.points);
        }
        if (pts.length === 0 || aborted) {
          map.setMinZoom(0);
          return;
        }

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

        // 컨테이너 크기를 먼저 확정. (localhost 에선 fetch 가 rAF invalidateSize 보다
        // 빨라 크기 미확정 상태로 getBoundsZoom 이 잘못된 fit 을 내고, 그 값으로 setMinZoom
        // 하면 현재 줌이 위로 clamp 되어 "갑자기 확대"됨.)
        map.invalidateSize();
        // getBoundsZoom 은 현재 minZoom 으로 clamp 됨. iOS 는 음수 줌 금지(바닥 0),
        // 데스크탑은 충분히 낮춰 진짜 fit 계산.
        map.setMinZoom(isIOS() ? 0 : -20);
        const fitZoom = map.getBoundsZoom(world);
        // fit 이 현재 줌보다 크게 나와도 현재(복원) 뷰를 끌어올리지 않도록 가드.
        map.setMinZoom(Math.min(fitZoom, map.getZoom()));

        // 첫 진입(저장된 뷰 없음): 월드 전체가 보이게 맞춤
        if (fitOnLoad && !aborted) map.fitBounds(world, { animate: false });
      } catch {
        if (!aborted) map.setMinZoom(0);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [map, worldName, maxOut]);

  return null;
}
