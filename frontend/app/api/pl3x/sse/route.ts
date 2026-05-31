import { addClient, removeClient } from "@/lib/pl3x/sse-hub";
import { fetchGlobalSettings } from "@/lib/pl3x/server";

// 영구 연결: 정적 최적화/캐시 금지, nodejs 런타임(기본)
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      addClient("/sse", controller);

      // 새 클라에게 현재 플레이어 스냅샷을 즉시 전달 (다음 업스트림 이벤트까지 기다리지 않게)
      try {
        const settings = await fetchGlobalSettings();
        controller.enqueue(
          encoder.encode(
            `event: settings\ndata: ${JSON.stringify({ players: settings.players })}\n\n`,
          ),
        );
      } catch {
        // 스냅샷 실패는 무시 — 업스트림/폴백이 채움
      }

      // 클라 연결 종료 시 정리
      request.signal.addEventListener("abort", () => {
        removeClient("/sse", controller);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      // ReadableStream 취소 시에도 정리 (signal abort와 중복 호출 안전)
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // 프록시(Traefik/nginx) 버퍼링 방지 — 백엔드와 동일
      "X-Accel-Buffering": "no",
    },
  });
}
