"use client";

import type { WorldListEntry } from "@/lib/pl3x/types";

interface WorldSelectorProps {
  worlds: WorldListEntry[];
  worldName: string;
  renderer: string;
  onWorldChange: (name: string) => void;
  onRendererChange: (label: string) => void;
  busy?: boolean;
}

function Segmented<T extends string>({
  items,
  value,
  onChange,
  busy,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  busy?: boolean;
}) {
  return (
    <div className="pointer-events-auto flex gap-1 rounded-lg bg-neutral-900/95 p-1 shadow-xl ring-1 ring-white/10">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            disabled={busy}
            aria-pressed={active}
            onClick={() => onChange(it.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-sm ${
              active
                ? "bg-sky-500/90 text-white"
                : "text-neutral-300 hover:bg-white/10"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function WorldSelector({
  worlds,
  worldName,
  renderer,
  onWorldChange,
  onRendererChange,
  busy,
}: WorldSelectorProps) {
  const current = worlds.find((w) => w.name === worldName);
  const renderers = current?.renderers ?? [];
  const ordered = [...worlds].sort((a, b) => a.order - b.order);

  return (
    <div className="absolute left-1/2 top-3 z-[1100] flex -translate-x-1/2 flex-col items-center gap-2">
      <Segmented
        items={ordered.map((w) => ({ key: w.name, label: w.displayName }))}
        value={worldName}
        onChange={onWorldChange}
        busy={busy}
      />
      {renderers.length > 1 && (
        <Segmented
          items={renderers.map((r) => ({ key: r.label, label: r.label }))}
          value={renderer}
          onChange={onRendererChange}
          busy={busy}
        />
      )}
    </div>
  );
}
