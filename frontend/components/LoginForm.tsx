"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** 공유 비밀번호 로그인 폼. 성공 시 next(기본 /pro)로 이동. */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/pro";

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        router.replace(next.startsWith("/") ? next : "/pro");
        router.refresh();
        return;
      }
      if (r.status === 503) setError("서버에 비밀번호가 설정되지 않았습니다.");
      else setError("비밀번호가 올바르지 않습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-950 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs space-y-4 rounded-2xl bg-neutral-900 p-6 text-neutral-100 shadow-2xl ring-1 ring-white/10"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">관리 보기 로그인</h1>
          <p className="text-sm text-neutral-400">
            플레이어 위치 보기는 비밀번호가 필요합니다.
          </p>
        </div>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          className="w-full rounded-lg bg-white/5 px-3 py-2 text-base outline-none ring-1 ring-white/10 transition-colors focus:ring-sky-500"
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="w-full rounded-lg bg-sky-600 px-3 py-2 font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "확인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
