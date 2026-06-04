import { cookies } from "next/headers";
import { AUTH_COOKIE, expectedToken, passwordMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_AGE = 60 * 60 * 24 * 30; // 30일

export async function POST(request: Request): Promise<Response> {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    // 빈 비번 → 아래에서 실패 처리
  }

  if (!(await passwordMatches(password))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const token = await expectedToken();
  if (!token) {
    // MAP_PASSWORD 미설정 — 서버 구성 오류
    return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return Response.json({ ok: true });
}
