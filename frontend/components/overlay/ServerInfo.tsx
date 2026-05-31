"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

// 서버 접속 정보 (수정은 여기서)
const SERVER = {
  address: "mc.xenv.cc",
  bedrockPort: 19132,
};

export function ServerInfo() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyText(SERVER.address)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="클릭하여 주소 복사"
      className={`pointer-events-auto absolute left-1/2 top-3 z-[1100] w-auto -translate-x-1/2 overflow-hidden rounded-xl text-left text-neutral-100 shadow-xl ring-1 ring-white/10 backdrop-blur transition-colors sm:left-auto sm:right-3 sm:top-auto sm:bottom-3 sm:w-60 sm:translate-x-0 ${
        copied ? "bg-emerald-500/85" : "bg-neutral-900/85 hover:bg-neutral-800/85"
      }`}
    >
      {/* 제목 — 데스크탑만 */}
      <div className="hidden px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 sm:block">
        서버 접속
      </div>

      {/* 주소 + 복사 — 항상(모바일 단일행) */}
      <div className="flex items-center gap-2 px-3 py-1.5 sm:pt-0.5">
        <span className="flex-1 truncate font-mono text-sm font-semibold text-neutral-50 sm:text-base">
          {SERVER.address}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${
            copied ? "bg-white/20 text-white" : "bg-white/10 text-neutral-300"
          }`}
        >
          {copied ? "복사됨" : "복사"}
        </span>
      </div>

      {/* 안내 — 데스크탑만 */}
      <div className="hidden px-3 pb-2 text-[11px] text-neutral-300/80 sm:block">
        Java · Bedrock 공통{" "}
        <span className="opacity-70">(베드락 포트 {SERVER.bedrockPort})</span>
      </div>
    </button>
  );
}
