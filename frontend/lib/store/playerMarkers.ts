import { create } from "zustand";

// 지도용 플레이어 마커(위치 + yaw). pl3xmap_players 마커 레이어에서 옴.
// (패널용 목록/카운트는 별도로 usePlayersStore = settings SSE 사용)
export interface PlayerMarker {
  uuid: string;
  x: number;
  z: number;
  yaw: number; // 도(degree), 시계방향
}

interface PlayerMarkersState {
  markers: Record<string, PlayerMarker>;
  setMarkers: (list: PlayerMarker[]) => void;
}

export const usePlayerMarkersStore = create<PlayerMarkersState>((set) => ({
  markers: {},
  setMarkers: (list) =>
    set(() => {
      const markers: Record<string, PlayerMarker> = {};
      for (const m of list) markers[m.uuid] = m;
      return { markers };
    }),
}));
