import { fetchGlobalSettings } from "@/lib/pl3x/server";

// 공개 온라인 플레이어 목록 — 좌표(position)/월드(world) 제거, 이름만.
// 공개 / 라우트의 플레이어 패널이 이걸 폴링한다. (위치는 /pro 인증 뒤에서만)
export const dynamic = "force-dynamic";

interface PublicPlayer {
  name: string;
  uuid: string;
  displayName: string;
}

// 사용자 수와 무관하게 백엔드 부하를 묶기 위한 초단기 캐시
let cache: { at: number; players: PublicPlayer[] } | null = null;
const TTL_MS = 2000;

export async function GET(): Promise<Response> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return Response.json({ players: cache.players });
  }
  try {
    const settings = await fetchGlobalSettings();
    const players: PublicPlayer[] = (settings.players ?? []).map((p) => ({
      name: p.name,
      uuid: p.uuid,
      displayName: p.displayName,
    }));
    cache = { at: now, players };
    return Response.json({ players });
  } catch {
    // 백엔드 일시 장애 — 직전 캐시라도 반환, 없으면 빈 목록
    return Response.json({ players: cache?.players ?? [] });
  }
}
