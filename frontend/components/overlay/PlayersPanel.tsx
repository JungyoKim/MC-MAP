"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { usePlayersStore } from "@/lib/store/players";
import { useFollowStore } from "@/lib/store/follow";

interface PlayersPanelProps {
  worldName: string;
  maxPlayers: number;
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

  const list = Object.values(players).sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? ""),
  );

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-[1100] flex max-h-[60dvh] w-56 flex-col overflow-hidden rounded-lg bg-neutral-900/80 text-neutral-100 shadow-xl ring-1 ring-white/10 backdrop-blur">
      <div className="border-b border-white/10 px-3 py-2 text-sm font-semibold">
        플레이어{" "}
        <span className="text-neutral-400">
          {online}/{maxPlayers}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
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
    </div>
  );
}
