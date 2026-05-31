"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface InitialViewProps {
  center: [number, number];
  zoom: number;
  minZoom: number;
}

/**
 * 생성 시 minZoom prop 적용이 react-leaflet 에서 racy 해서, 복원 줌(축소 상태)이
 * clamp 되어 "갑자기 확대"되는 현상이 있음. 마운트 1회만 minZoom 을 풀고 의도한
 * 뷰를 애니메이션 없이 재적용해 결정적으로 보정한다. (인라인 ref 와 달리 1회 실행 → thrash 없음)
 */
export function InitialView({ center, zoom, minZoom }: InitialViewProps) {
  const map = useMap();
  useEffect(() => {
    map.setMinZoom(minZoom);
    map.setView(center, zoom, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
