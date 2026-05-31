import { create } from "zustand";

// 추적 중인 플레이어 uuid (없으면 null). 카메라가 해당 플레이어를 계속 따라감.
interface FollowState {
  followUuid: string | null;
  setFollow: (uuid: string | null) => void;
  toggleFollow: (uuid: string) => void;
}

export const useFollowStore = create<FollowState>((set) => ({
  followUuid: null,
  setFollow: (followUuid) => set({ followUuid }),
  toggleFollow: (uuid) =>
    set((s) => ({ followUuid: s.followUuid === uuid ? null : uuid })),
}));
