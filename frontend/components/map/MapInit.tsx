"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * 월드 전환(리마운트) 후 컨테이너 크기가 확정되기 전이라 타일이 줌 전까지 안 뜨는 문제 →
 * mount 시 invalidateSize 로 크기 재계산 강제.
 */
export function MapInit() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [map]);
  return null;
}
