import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  return Response.json({ ok: true });
}
