import { cookies } from "next/headers";
import { addClient, removeClient } from "@/lib/pl3x/sse-hub";
import { PL3XMAP_BASE_URL } from "@/lib/pl3x/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

// 영구 연결: 정적 최적화/캐시 금지, nodejs 런타임(기본)
export const dynamic = "force-dynamic";

// 월드별 SSE relay (/sse/{world}). markers 이벤트(플레이어 위치)를 fan-out.
// proxy.ts 가 1차로 막지만, 좌표를 흘리는 핵심 엔드포인트라 핸들러에서도 검증(심층 방어).
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/pl3x/sse/[world]">,
): Promise<Response> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!(await verifyToken(token))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { world } = await ctx.params;
  const path = `/sse/${world}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      addClient(path, controller);

      // 새 클라에게 현재 플레이어 마커 스냅샷을 즉시 전달
      try {
        const res = await fetch(
          `${PL3XMAP_BASE_URL}/tiles/${world}/markers/pl3xmap_players.json`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const markers = await res.json();
          controller.enqueue(
            encoder.encode(
              `event: markers\ndata: ${JSON.stringify({ key: "pl3xmap_players", markers })}\n\n`,
            ),
          );
        }
      } catch {
        // 스냅샷 실패는 무시 — 업스트림/폴백이 채움
      }

      request.signal.addEventListener("abort", () => {
        removeClient(path, controller);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
