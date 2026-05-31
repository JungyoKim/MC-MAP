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
      className={`pointer-events-auto absolute bottom-3 right-3 z-[1100] w-52 overflow-hidden rounded-xl text-left text-neutral-100 shadow-xl ring-1 ring-white/10 backdrop-blur transition-colors sm:w-60 ${
        copied ? "bg-emerald-500/85" : "bg-neutral-900/85 hover:bg-neutral-800/85"
      }`}
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-300">
          서버 접속
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] ${
            copied ? "bg-white/20 text-white" : "bg-white/10 text-neutral-300"
          }`}
        >
          {copied ? "복사됨" : "복사"}
        </span>
      </div>
      <div className="px-3 pt-0.5 font-mono text-base font-semibold text-neutral-50">
        {SERVER.address}
      </div>
      <div className="px-3 pb-2 text-[11px] text-neutral-300/80">
        Java · Bedrock 공통{" "}
        <span className="opacity-70">(베드락 포트 {SERVER.bedrockPort})</span>
      </div>
    </button>
  );
}
