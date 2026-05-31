import { MapPage } from "@/components/MapPage";

export const dynamic = "force-dynamic";

// 공개 라우트: 온라인 목록은 보이되 지도상 위치는 숨김
export default function Home() {
  return <MapPage admin={false} />;
}
