import { MapPage } from "@/components/MapPage";

export const dynamic = "force-dynamic";

// 관리용 라우트: 플레이어 위치(마커/추적)까지 표시
export default function Admin() {
  return <MapPage admin={true} />;
}
