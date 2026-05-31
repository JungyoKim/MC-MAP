"use client";

import { useEffect, useRef } from "react";
import type { LeafletMouseEvent } from "leaflet";
import { useMapStore } from "@/lib/store/map";
import { latLngToBlock } from "@/lib/pl3x/coords";
import { ensurePalettes, resolveBlockInfo } from "@/lib/pl3x/blockinfo";
import { copyText } from "@/lib/clipboard";

interface CoordsBoxProps {
  worldName: string;
  maxOut: number;
}

const RESOLVE_THROTTLE_MS = 80;

/**
 * 좌표 x,y,z + 바이옴. window mousemove + map.mouseEventToLatLng 로 추적해 오버레이 UI
 * 위에서도 커서 아래 좌표 표시. 표시는 ref+DOM 직접 갱신(드래그 끊김 방지).
 * 지도 클릭 시 그 지점 좌표를 "x y z"로 복사 + 박스가 초록 반투명으로 바뀌며 "복사됨" 표시.
 * (복사 피드백도 ref/DOM 으로 처리 → 리렌더로 좌표 텍스트가 초기화되지 않음)
 */
export function CoordsBox({ worldName, maxOut }: CoordsBoxProps) {
  const map = useMapStore((s) => s.map);
  const boxRef = useRef<HTMLDivElement>(null);
  const xyzRef = useRef<HTMLSpanElement>(null);
  const sepRef = useRef<HTMLSpanElement>(null);
  const biomeRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const lastY = useRef<number | null>(null);
  const lastResolve = useRef(0);
  const reqId = useRef(0);

  useEffect(() => {
    ensurePalettes(worldName);
  }, [worldName]);

  useEffect(() => {
    if (!map) return;
    lastY.current = null;

    const writeXYZ = (x: number, z: number) => {
      if (xyzRef.current)
        xyzRef.current.textContent = `${x}, ${lastY.current ?? "-"}, ${z}`;
    };
    const writeBiome = (b: string | null) => {
      if (biomeRef.current) biomeRef.current.textContent = b ?? "";
      if (sepRef.current) sepRef.current.style.display = b ? "" : "none";
    };

    const onMove = (e: MouseEvent) => {
      const ll = map.mouseEventToLatLng(e);
      const { x, z } = latLngToBlock(ll.lat, ll.lng, maxOut);
      const bx = Math.floor(x);
      const bz = Math.floor(z);
      writeXYZ(bx, bz);

      const now = performance.now();
      if (now - lastResolve.current < RESOLVE_THROTTLE_MS) return;
      lastResolve.current = now;
      const id = ++reqId.current;
      const zoom = map.getZoom();
      void resolveBlockInfo(worldName, maxOut, zoom, bx, bz).then((info) => {
        if (id !== reqId.current) return;
        lastY.current = info.y;
        writeXYZ(bx, bz);
        writeBiome(info.biome);
      });
    };

    let copyTimer: ReturnType<typeof setTimeout> | null = null;
    const showCopied = () => {
      if (boxRef.current) boxRef.current.style.backgroundColor = "rgba(16,185,129,0.85)";
      if (hintRef.current) {
        hintRef.current.textContent = "복사됨";
        hintRef.current.style.color = "#fff";
      }
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        if (boxRef.current) boxRef.current.style.backgroundColor = "";
        if (hintRef.current) {
          hintRef.current.textContent = "클릭 복사";
          hintRef.current.style.color = "";
        }
      }, 1500);
    };

    const onClick = async (e: LeafletMouseEvent) => {
      const { x, z } = latLngToBlock(e.latlng.lat, e.latlng.lng, maxOut);
      const bx = Math.floor(x);
      const bz = Math.floor(z);
      const info = await resolveBlockInfo(worldName, maxOut, map.getZoom(), bx, bz);
      const text = info.y != null ? `${bx} ${info.y} ${bz}` : `${bx} ${bz}`;
      if (await copyText(text)) showCopied();
    };

    window.addEventListener("mousemove", onMove);
    map.on("click", onClick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      map.off("click", onClick);
      if (copyTimer) clearTimeout(copyTimer);
    };
  }, [map, worldName, maxOut]);

  return (
    <div
      ref={boxRef}
      className="pointer-events-none absolute bottom-3 left-3 z-[1100] flex items-center gap-2 rounded-md bg-neutral-900/85 px-2.5 py-1.5 text-xs text-neutral-100 shadow-lg ring-1 ring-white/10 backdrop-blur transition-colors sm:left-1/2 sm:-translate-x-1/2 sm:px-3 sm:text-sm"
    >
      <span ref={xyzRef} className="font-mono tabular-nums">
        -, -, -
      </span>
      <span ref={sepRef} className="text-neutral-600" style={{ display: "none" }}>
        ·
      </span>
      <span ref={biomeRef} className="text-neutral-300" />
      <span ref={hintRef} className="ml-0.5 hidden text-[11px] text-neutral-500 sm:inline">
        클릭 복사
      </span>
    </div>
  );
}
