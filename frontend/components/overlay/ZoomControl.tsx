"use client";

import { useMapStore } from "@/lib/store/map";

interface ZoomControlProps {
  /** 전체보기 시 중심 [lat, lng] (월드 중심) */
  center: [number, number];
}

export function ZoomControl({ center }: ZoomControlProps) {
  const map = useMapStore((s) => s.map);

  const btn =
    "flex size-8 sm:size-9 items-center justify-center text-neutral-200 transition-colors hover:bg-white/10 active:bg-white/20 disabled:opacity-40";

  return (
    <div className="pointer-events-auto flex flex-col overflow-hidden rounded-lg bg-neutral-900/95 text-neutral-100 shadow-xl ring-1 ring-white/10">
      <button
        type="button"
        aria-label="확대"
        onClick={() => map?.zoomIn()}
        className={`${btn} text-lg`}
      >
        +
      </button>
      <span className="h-px bg-white/10" />
      <button
        type="button"
        aria-label="축소"
        onClick={() => map?.zoomOut()}
        className={`${btn} text-lg`}
      >
        −
      </button>
      <span className="h-px bg-white/10" />
      <button
        type="button"
        aria-label="전체 보기"
        onClick={() => map?.setView(center, map.getMinZoom(), { animate: true })}
        className={btn}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-4"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
        </svg>
      </button>
    </div>
  );
}
