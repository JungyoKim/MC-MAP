// 공유 비밀번호 기반 인증 (개인 서버용). 비번은 env MAP_PASSWORD.
// 쿠키엔 비번 자체가 아니라 비번 해시 토큰을 담는다(httpOnly + Secure).
// proxy.ts(인증 게이트), 로그인 라우트, 데이터 라우트(심층 방어)에서 공용.

export const AUTH_COOKIE = "map_auth";
const SALT = "pl3x-map::"; // 평문 비번 해시와 구분용 프리픽스

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 길이가 같은 두 문자열의 상수시간 비교 (타이밍 누출 방지)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** 설정된 비번에 대응하는 쿠키 토큰. 비번 미설정 시 null(= 항상 차단). */
export async function expectedToken(): Promise<string | null> {
  const pw = process.env.MAP_PASSWORD;
  if (!pw) return null;
  return sha256Hex(SALT + pw);
}

/** 쿠키 토큰 검증. 비번 미설정이면 무조건 false(fail-closed). */
export async function verifyToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedToken();
  if (!expected) return false;
  return safeEqual(token, expected);
}

/** 로그인 입력 비번이 일치하는지 (해시 상수시간 비교). */
export async function passwordMatches(input: string): Promise<boolean> {
  const pw = process.env.MAP_PASSWORD;
  if (!pw || !input) return false;
  return safeEqual(await sha256Hex(input), await sha256Hex(pw));
}
