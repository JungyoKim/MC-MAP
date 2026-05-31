import "server-only";
import { PL3XMAP_BASE_URL } from "./server";

/**
 * SSE fan-out 허브 (업스트림 경로별).
 * Pl3xMap 의 각 SSE 엔드포인트(루트 /sse, 월드별 /sse/{world})에 업스트림 연결을
 * **경로당 1개만** 열고, 그 이벤트를 해당 경로에 연결된 모든 클라이언트에 재전송한다.
 * (100명 규모: Pl3xMap 부하는 경로당 1명분)
 *
 * 업스트림 청크가 이벤트 프레임 중간에서 쪼개질 수 있으므로 \n\n 단위로 완전한
 * 프레임을 재조립한 뒤 재전송. heartbeat(완전한 :hb 프레임)는 프레임 사이에만 끼므로 안전.
 */

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15_000;
const RECONNECT_MS = 2_000;

interface Hub {
  clients: Set<ReadableStreamDefaultController<Uint8Array>>;
  upstream: AbortController | null;
  heartbeat: ReturnType<typeof setInterval> | null;
}

const hubs = new Map<string, Hub>(); // key = 업스트림 경로 ("/sse", "/sse/world" ...)

function getHub(path: string): Hub {
  let h = hubs.get(path);
  if (!h) {
    h = { clients: new Set(), upstream: null, heartbeat: null };
    hubs.set(path, h);
  }
  return h;
}

function broadcast(h: Hub, text: string): void {
  const bytes = encoder.encode(text);
  for (const ctrl of h.clients) {
    try {
      ctrl.enqueue(bytes);
    } catch {
      h.clients.delete(ctrl);
    }
  }
}

async function runUpstream(path: string, h: Hub): Promise<void> {
  while (h.upstream) {
    try {
      const res = await fetch(`${PL3XMAP_BASE_URL}${path}`, {
        headers: { Accept: "text/event-stream" },
        signal: h.upstream.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body) throw new Error(`upstream ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (frame.length > 0) broadcast(h, frame + "\n\n");
        }
      }
    } catch {
      // 연결 끊김 — 클라가 남아있으면 재연결
    }
    if (!h.upstream) break;
    await new Promise((r) => setTimeout(r, RECONNECT_MS));
  }
}

function ensureRunning(path: string, h: Hub): void {
  if (!h.upstream) {
    h.upstream = new AbortController();
    void runUpstream(path, h);
  }
  if (!h.heartbeat) {
    h.heartbeat = setInterval(() => broadcast(h, ":hb\n\n"), HEARTBEAT_MS);
  }
}

function stopIfIdle(path: string, h: Hub): void {
  if (h.clients.size > 0) return;
  h.upstream?.abort();
  h.upstream = null;
  if (h.heartbeat) {
    clearInterval(h.heartbeat);
    h.heartbeat = null;
  }
  hubs.delete(path);
}

export function addClient(
  path: string,
  ctrl: ReadableStreamDefaultController<Uint8Array>,
): void {
  const h = getHub(path);
  h.clients.add(ctrl);
  ensureRunning(path, h);
}

export function removeClient(
  path: string,
  ctrl: ReadableStreamDefaultController<Uint8Array>,
): void {
  const h = hubs.get(path);
  if (!h) return;
  h.clients.delete(ctrl);
  stopIfIdle(path, h);
}
