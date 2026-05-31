import { MapPage } from "@/components/MapPage";

export const dynamic = "force-dynamic";

// 관리용 라우트: 플레이어 위치/패널 표시
export default function Admin() {
  return <MapPage showPlayers={true} />;
}
