import { MapClient } from "@/components/map/MapClient";
import {
  defaultWorld,
  fetchGlobalSettings,
  fetchWorldSettings,
} from "@/lib/pl3x/server";

export const dynamic = "force-dynamic";

export default async function Home() {
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
    />
  );
}
