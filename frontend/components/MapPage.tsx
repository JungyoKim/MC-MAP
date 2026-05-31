import { MapClient } from "@/components/map/MapClient";
import {
  defaultWorld,
  fetchGlobalSettings,
  fetchWorldSettings,
} from "@/lib/pl3x/server";

/**
 * 서버에서 settings 페치 후 지도 렌더. showPlayers 로 플레이어 위치 표시 여부 결정.
 * - 공개 / : showPlayers=false (플레이어 데이터 자체를 안 가져옴)
 * - /admin : showPlayers=true
 */
export async function MapPage({ showPlayers }: { showPlayers: boolean }) {
  const global = await fetchGlobalSettings();
  const first = defaultWorld(global);
  const world = await fetchWorldSettings(first.name);
  const renderer = first.renderers[0]?.label ?? "basic";

  return (
    <MapClient
      global={global}
      world={world}
      worldName={first.name}
      renderer={renderer}
      showPlayers={showPlayers}
    />
  );
}
