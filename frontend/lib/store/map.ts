import { create } from "zustand";
import type { Map as LeafletMap } from "leaflet";

// 현재 Leaflet 지도 인스턴스를 공유. MapContainer 밖의 오버레이(줌/좌표/플레이어)가
// 이걸 통해 지도를 제어한다. 월드 전환 시 MapView 리마운트로 새 인스턴스로 교체됨.
interface MapStore {
  map: LeafletMap | null;
  setMap: (map: LeafletMap | null) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
}));
