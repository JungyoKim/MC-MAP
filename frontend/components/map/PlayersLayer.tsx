"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { usePlayerMarkersStore } from "@/lib/store/playerMarkers";
import { usePlayersStore } from "@/lib/store/players";
import { useFollowStore } from "@/lib/store/follow";
import { blockToCenteredLatLng } from "@/lib/pl3x/coords";

interface PlayersLayerProps {
  worldName: string;
  maxOut: number;
}

interface MarkerEntry {
  marker: L.Marker;
  cur: { lat: number; lng: number };
  target: { lat: number; lng: number };
  curYaw: number;
  targetYaw: number;
  rotEl: HTMLElement | null;
  nameEl: HTMLElement | null;
  name: string;
}

const LERP = 0.18; // 위치 보간 계수
const YAW_LERP = 0.25; // 방향 보간 계수
// MC yaw 0 = 남(+z, 화면상 아래). 위를 향하는 화살표 기준 보정값.
const YAW_OFFSET = 180;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

// 최단 경로 각도 보간 (wraparound)
function lerpAngle(cur: number, target: number, t: number): number {
  let diff = ((target - cur + 540) % 360) - 180;
  return cur + diff * t;
}

function markerHtml(name: string): string {
  return `
    <div class="pl3x-pm-rot">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M15 2 L21 13 L15 10 L9 13 Z" fill="#0ea5e9" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="15" cy="16" r="6.5" fill="#0ea5e9" stroke="#fff" stroke-width="2.5"/>
      </svg>
    </div>
    <span class="pl3x-player-name">${name}</span>`;
}

/**
 * 플레이어 방향 마커: 위치 + yaw 를 rAF 로 보간(부드러운 이동/회전).
 * React 리렌더 없이 매 프레임 setLatLng + 회전 요소 transform 갱신.
 */
export function PlayersLayer({ worldName, maxOut }: PlayersLayerProps) {
  const map = useMap();
  const markers = usePlayerMarkersStore((s) => s.markers);
  const names = usePlayersStore((s) => s.players);
  const setFollow = useFollowStore((s) => s.setFollow);
  const entriesRef = useRef<Map<string, MarkerEntry>>(new Map());

  useEffect(() => {
    if (!map.getPane("players")) {
      const pane = map.createPane("players");
      pane.style.zIndex = "600";
    }
  }, [map]);

  // 유저가 지도를 직접 조작하면 추적 해제
  useEffect(() => {
    const cancel = () => {
      if (useFollowStore.getState().followUuid) setFollow(null);
    };
    map.on("mousedown", cancel);
    map.on("dragstart", cancel);
    return () => {
      map.off("mousedown", cancel);
      map.off("dragstart", cancel);
    };
  }, [map, setFollow]);

  // 마커 목록 변경 → 타깃 갱신 / 추가 / 제거
  useEffect(() => {
    const entries = entriesRef.current;
    const seen = new Set<string>();

    for (const pm of Object.values(markers)) {
      seen.add(pm.uuid);
      const [lat, lng] = blockToCenteredLatLng(pm.x, pm.z, maxOut);
      const yaw = pm.yaw + YAW_OFFSET;
      // 이름은 settings 스트림(=names)에서 옴. 마커가 먼저 도착하면 uuid 앞 8자리로 임시 표시 후,
      // 이름이 도착/변경되면 아래에서 라벨을 갱신한다.
      const desiredName =
        names[pm.uuid]?.displayName || names[pm.uuid]?.name || pm.uuid.slice(0, 8);
      const existing = entries.get(pm.uuid);
      if (existing) {
        existing.target = { lat, lng };
        existing.targetYaw = yaw;
        if (existing.name !== desiredName && existing.nameEl) {
          existing.nameEl.textContent = desiredName; // textContent = 자동 이스케이프
          existing.name = desiredName;
        }
      } else {
        const icon = L.divIcon({
          className: "pl3x-pm",
          html: markerHtml(escapeHtml(desiredName)),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const marker = L.marker([lat, lng], { icon, pane: "players" });
        marker.addTo(map);
        const el = marker.getElement();
        const rotEl = (el?.querySelector(".pl3x-pm-rot") as HTMLElement) ?? null;
        const nameEl =
          (el?.querySelector(".pl3x-player-name") as HTMLElement) ?? null;
        if (rotEl) rotEl.style.transform = `rotate(${yaw}deg)`;
        entries.set(pm.uuid, {
          marker,
          cur: { lat, lng },
          target: { lat, lng },
          curYaw: yaw,
          targetYaw: yaw,
          rotEl,
          nameEl,
          name: desiredName,
        });
      }
    }

    for (const [uuid, e] of entries) {
      if (!seen.has(uuid)) {
        e.marker.remove();
        entries.delete(uuid);
      }
    }
  }, [markers, names, worldName, maxOut, map]);

  // rAF 보간 루프 (+ follow 카메라)
  useEffect(() => {
    let raf = 0;
    const step = () => {
      for (const e of entriesRef.current.values()) {
        const dLat = e.target.lat - e.cur.lat;
        const dLng = e.target.lng - e.cur.lng;
        if (Math.abs(dLat) > 1e-9 || Math.abs(dLng) > 1e-9) {
          e.cur.lat += dLat * LERP;
          e.cur.lng += dLng * LERP;
          e.marker.setLatLng([e.cur.lat, e.cur.lng]);
        }
        const dYaw = ((e.targetYaw - e.curYaw + 540) % 360) - 180;
        if (Math.abs(dYaw) > 0.1) {
          e.curYaw = lerpAngle(e.curYaw, e.targetYaw, YAW_LERP);
          if (e.rotEl) e.rotEl.style.transform = `rotate(${e.curYaw}deg)`;
        }
      }
      // follow: 추적 중인 플레이어를 화면 중앙에 고정
      const fid = useFollowStore.getState().followUuid;
      if (fid) {
        const e = entriesRef.current.get(fid);
        if (e) map.setView([e.cur.lat, e.cur.lng], map.getZoom(), { animate: false });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [map]);

  useEffect(() => {
    const entries = entriesRef.current;
    return () => {
      for (const e of entries.values()) e.marker.remove();
      entries.clear();
    };
  }, []);

  return null;
}
