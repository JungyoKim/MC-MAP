import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

// Next.js 16: 구 middleware.ts → proxy.ts. 라우트 렌더 전에 실행되는 인증 게이트.
// 보호 대상(아래 matcher): /pro 페이지 + 플레이어 위치(좌표)를 흘리는 모든 엔드포인트.
// 타일 이미지/월드보더 마커는 공개라 matcher에 넣지 않는다.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (await verifyToken(token)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  // 데이터 엔드포인트(SSE / JSON)는 401. 페이지는 로그인으로 리다이렉트.
  if (pathname.startsWith("/api/") || pathname.startsWith("/tiles/")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/pro/:path*",
    // 플레이어 위치 SSE relay (마커 이벤트 = 좌표)
    "/api/pl3x/sse/:path*",
    // 폴백 폴링 + 직접 접근 차단: 좌표가 든 JSON들
    "/tiles/settings.json",
    "/tiles/:world/markers/pl3xmap_players.json",
  ],
};
