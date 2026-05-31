import { create } from "zustand";
import type { Player } from "@/lib/pl3x/types";

interface PlayersState {
  players: Record<string, Player>;
  online: number;
  connected: boolean; // SSE 연결 상태 (false면 폴백 폴링 중)
  setPlayers: (list: Player[]) => void;
  setConnected: (connected: boolean) => void;
}

export const usePlayersStore = create<PlayersState>((set) => ({
  players: {},
  online: 0,
  connected: false,
  setPlayers: (list) =>
    set(() => {
      const players: Record<string, Player> = {};
      for (const p of list) players[p.uuid] = p;
      return { players, online: list.length };
    }),
  setConnected: (connected) => set({ connected }),
}));
