"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { usePlayersStore } from "@/lib/store/players";
import { useFollowStore } from "@/lib/store/follow";

interface PlayersPanelProps {
  worldName: string;
  maxPlayers: number;
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  );
}

function PlayerAvatar({ uuid, name }: { uuid: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-sky-500/80 text-[10px] font-bold text-white">
        {(name || "?").charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://mc-heads.net/avatar/${uuid}/20`}
      alt=""
      width={20}
      height={20}
      className="size-5 shrink-0 rounded"
      style={{ imageRendering: "pixelated" }}
      onError={() => setFailed(true)}
    />
  );
}

export function PlayersPanel({ worldName, maxPlayers }: PlayersPanelProps) {
  const players = usePlayersStore((s) => s.players);
  const online = usePlayersStore((s) => s.online);
  const followUuid = useFollowStore((s) => s.followUuid);
  const toggleFollow = useFollowStore((s) => s.toggleFollow);

  // 모바일에서만 접기 가능 (데스크탑은 항상 펼침)
  // 주의: MediaQueryList.addEventListener 는 iOS Safari 14+ 전용이라 구버전에서 throw →
  // 어디서나 되는 resize 이벤트로 판별.
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const collapsed = isMobile && !open;
  const showList = !collapsed;

  const list = Object.values(players).sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? ""),
  );

  return (
    <div
      className={`pointer-events-auto absolute right-3 top-3 z-[1100] flex flex-col overflow-hidden rounded-lg bg-neutral-900/85 text-neutral-100 shadow-xl ring-1 ring-white/10 backdrop-blur ${
        collapsed ? "w-auto" : "w-44 sm:w-56"
      }`}
    >
      {isMobile ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold ${open ? "border-b border-white/10" : ""}`}
        >
          {open ? (
            <>
              <span>
                플레이어{" "}
                <span className="text-neutral-400">
                  {online}/{maxPlayers}
                </span>
              </span>
              <span className="ml-auto text-neutral-400">▾</span>
            </>
          ) : (
            <>
              <UserIcon className="size-3.5 text-sky-300" />
              <span className="tabular-nums">{online}</span>
            </>
          )}
        </button>
      ) : (
        <div className="border-b border-white/10 px-3 py-2 text-sm font-semibold">
          플레이어{" "}
          <span className="text-neutral-400">
            {online}/{maxPlayers}
          </span>
        </div>
      )}

      {showList && (
        <div className="max-h-[40dvh] flex-1 overflow-y-auto p-1 sm:max-h-[60dvh]">
          {list.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-neutral-500">
              접속자 없음
            </p>
          ) : (
            list.map((p) => {
              const following = followUuid === p.uuid;
              const otherWorld = !!p.world && p.world !== worldName;
              return (
                <Button
                  key={p.uuid}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onPress={() => toggleFollow(p.uuid)}
                  className={`justify-start gap-2 px-2 ${following ? "bg-sky-500/25" : ""}`}
                >
                  <PlayerAvatar uuid={p.uuid} name={p.displayName || p.name} />
                  <span className="flex-1 truncate text-left text-sm">
                    {p.displayName || p.name}
                  </span>
                  {following && <span className="text-xs text-sky-300">추적</span>}
                  {!following && otherWorld && (
                    <span className="text-[10px] text-neutral-500">다른 월드</span>
                  )}
                </Button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
