"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { TileLayerOptions } from "leaflet";
import { ReversedZoomLayer } from "./ReversedZoomTileLayer";

interface LiveTileLayerProps {
  url: string;
  options: TileLayerOptions;
  /** 타일 재요청 주기(ms). 0 이하면 갱신 안 함. */
  refreshMs: number;
}

/**
 * near-real-time 타일 갱신 (원래 Pl3xMap webui 의 DoubleTileLayer 방식).
 * 타일 레이어 2개를 두고, 주기마다 뒤(숨은) 레이어를 redraw → 완전히 로드되면 앞으로 교체.
 * 옛 타일이 새 타일 로드 완료 전까지 그대로 보여서 깜빡임이 없다.
 * (백엔드 no-cache 라 redraw 시 변경된 타일만 200, 나머지는 304)
 */
export function LiveTileLayer({ url, options, refreshMs }: LiveTileLayerProps) {
  const map = useMap();

  useEffect(() => {
    const l1 = new ReversedZoomLayer(url, options);
    const l2 = new ReversedZoomLayer(url, options);
    let current = 0; // 0 → 1 → 2 → 1 → 2 ...

    const swap = () => {
      if (current === 1) {
        l1.setZIndex(0);
        l2.setZIndex(1);
        current = 2;
      } else {
        l1.setZIndex(1);
        l2.setZIndex(0);
        current = 1;
      }
    };

    l1.on("load", swap);
    l2.on("load", swap);
    l1.addTo(map);
    l2.addTo(map);

    let timer: ReturnType<typeof setInterval> | null = null;
    if (refreshMs > 0) {
      timer = setInterval(() => {
        // 뒤 레이어를 다시 그림 → load 완료 시 swap 으로 앞으로
        if (current === 1) l2.redraw();
        else l1.redraw();
      }, refreshMs);
    }

    return () => {
      if (timer) clearInterval(timer);
      l1.off("load", swap);
      l2.off("load", swap);
      l1.remove();
      l2.remove();
    };
  }, [map, url, refreshMs, options]);

  return null;
}
