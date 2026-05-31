import type { NextConfig } from "next";

// Pl3xMap 백엔드 베이스 URL (LAN). SSE/JSON은 Route Handler가 프록시하고,
// 타일은 아래 rewrite로 Node를 거치지 않고 pass-through 한다.
const PL3XMAP_BASE_URL =
  process.env.PL3XMAP_BASE_URL ?? "http://10.10.20.10:8080";

const nextConfig: NextConfig = {
  // Docker/Dokploy 배포용 최소 standalone 서버 출력 (.next/standalone)
  output: "standalone",
  // leaflet 맵은 dev strict-mode 더블마운트와 궁합이 나빠 맵 인스턴스가 racy하게
  // 생성/파괴되며 초기 줌이 꼬임(전환 시 갑작스런 확대). 끄면 dev도 single-mount.
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        // 타일 이미지: Node 미경유 pass-through (ETag 304 재검증은 백엔드 헤더 그대로)
        source: "/tiles/:path*",
        destination: `${PL3XMAP_BASE_URL}/tiles/:path*`,
      },
    ];
  },
};

export default nextConfig;
