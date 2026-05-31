"use client";

import { useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";

// 서버 접속 정보 (수정은 여기서)
const SERVER = {
  address: "mc.xenv.cc",
  bedrockPort: 19132,
};

export function InfoButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const copy = async () => {
    if (await copyText(SERVER.address)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="서버 정보"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex size-8 items-center justify-center rounded-lg bg-neutral-900/95 text-neutral-200 shadow-xl ring-1 ring-white/10 transition-colors hover:bg-neutral-800/95 sm:size-9"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 7Zm1.25 10h-2.5v-6h2.5v6Z" />
        </svg>
      </button>

      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs overflow-hidden rounded-2xl bg-neutral-900 text-neutral-100 shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold">서버 접속</span>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="text-neutral-400 transition-colors hover:text-neutral-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <button
                type="button"
                onClick={copy}
                title="주소 복사"
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                  copied ? "bg-emerald-500/85" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="flex-1 truncate text-left font-mono text-base font-semibold">
                  {SERVER.address}
                </span>
                <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-xs">
                  {copied ? "복사됨" : "복사"}
                </span>
              </button>

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Java</dt>
                  <dd className="font-mono">{SERVER.address}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Bedrock</dt>
                  <dd className="font-mono">
                    {SERVER.address}{" "}
                    <span className="text-neutral-400">: {SERVER.bedrockPort}</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
