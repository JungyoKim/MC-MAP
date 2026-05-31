import { MapPage } from "@/components/MapPage";

export const dynamic = "force-dynamic";

// 공개 라우트: 플레이어 위치 숨김
export default function Home() {
  return <MapPage showPlayers={false} />;
}
