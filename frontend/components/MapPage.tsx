import { MapClient } from "@/components/map/MapClient";
import {
  defaultWorld,
  fetchGlobalSettings,
  fetchWorldSettings,
} from "@/lib/pl3x/server";

/**
 * 서버에서 settings 페치 후 지도 렌더.
 * - 공개 / : 온라인 목록 패널만(showPlayerList), 지도 위치 마커는 숨김(showPlayerMarkers=false)
 * - /pro : 둘 다 (마커/추적 포함)
 */
export async function MapPage({ admin = false }: { admin?: boolean }) {
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
      showPlayerList={true}
      showPlayerMarkers={admin}
    />
  );
}
