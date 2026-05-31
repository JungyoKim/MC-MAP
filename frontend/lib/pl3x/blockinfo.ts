// blockinfo: 마우스 위치의 블록 y(높이) + 바이옴 조회.
// 데이터는 모두 /tiles rewrite 로 접근(서버가 Content-Encoding: gzip → fetch 가 자동 해제).
// 근거: reference Block.ts / BlockInfo.ts / BlockInfoControl.ts (SPEC.md)

/** packed int 1개 디코드: block(11) / biome(9) / yPos(12) */
function decodePacked(packed: number, minY: number) {
  return {
    block: packed >>> 21,
    biome: (packed >>> 12) & 0x1ff,
    y: (packed & 0xfff) + minY,
  };
}

class BlockInfo {
  private readonly data: Uint8Array;
  readonly minY: number;

  constructor(data: Uint8Array) {
    this.data = data;
    this.minY = this.getInt(8);
  }

  private getInt(pos: number): number {
    let val = 0;
    for (let i = 0; i < 4; i++) {
      val |= (this.data[pos + i] & 0xff) << (8 * (3 - i));
    }
    return val;
  }

  getBlock(index: number) {
    return decodePacked(this.getInt(12 + index * 4), this.minY);
  }
}

// ── 캐시 (모듈 전역) ───────────────────────────────────────────────
type Palette = Record<string, string>;
let blocksPalette: Promise<Palette> | null = null;
const biomesPalettes = new Map<string, Promise<Palette>>();
const tiles = new Map<string, Promise<BlockInfo | null>>();

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return r.json() as Promise<T>;
  });
}

function loadBlocks(): Promise<Palette> {
  if (!blocksPalette) blocksPalette = fetchJson<Palette>("/tiles/blocks.gz");
  return blocksPalette;
}

function loadBiomes(world: string): Promise<Palette> {
  let p = biomesPalettes.get(world);
  if (!p) {
    p = fetchJson<Palette>(`/tiles/${world}/biomes.gz`);
    biomesPalettes.set(world, p);
  }
  return p;
}

/** 팔레트를 미리 적재 (CoordsBox 마운트 시) */
export function ensurePalettes(world: string): void {
  void loadBlocks().catch(() => {});
  void loadBiomes(world).catch(() => {});
}

function loadTile(
  world: string,
  zoom: number,
  fileX: number,
  fileZ: number,
): Promise<BlockInfo | null> {
  const key = `${world}/${zoom}/${fileX}_${fileZ}`;
  let p = tiles.get(key);
  if (!p) {
    p = fetch(`/tiles/${world}/${zoom}/blockinfo/${fileX}_${fileZ}.pl3xmap.gz`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => (buf ? new BlockInfo(new Uint8Array(buf)) : null))
      .catch(() => null);
    tiles.set(key, p);
  }
  return p;
}

/** "minecraft:flower_forest" → "Flower Forest" */
function langName(key: string): string {
  let name = key;
  if (name.includes(":")) {
    name = name
      .split(":")[1]
      .split(".")
      .pop()!
      .replace(/_+/g, " ")
      .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1));
  }
  return name;
}

export interface BlockLookup {
  y: number | null;
  biome: string | null;
}

/**
 * 블록좌표(blockX, blockZ)의 y + 바이옴 조회.
 * 타일/팔레트는 캐시(워밍업 후 즉시). 데이터 없으면 null.
 */
export async function resolveBlockInfo(
  world: string,
  maxOut: number,
  leafletZoom: number,
  blockX: number,
  blockZ: number,
): Promise<BlockLookup> {
  // blockinfo 타일은 정수 native zoom(0..maxOut)에 존재
  const zoom = Math.max(0, Math.min(maxOut, maxOut - Math.round(leafletZoom)));
  const step = 1 << zoom;
  const regionX = blockX >> 9;
  const regionZ = blockZ >> 9;
  const fileX = Math.floor(regionX / step);
  const fileZ = Math.floor(regionZ / step);
  const tileX = (blockX / step) & 511;
  const tileZ = (blockZ / step) & 511;
  const index = tileZ * 512 + tileX;

  const tile = await loadTile(world, zoom, fileX, fileZ);
  if (!tile) return { y: null, biome: null };

  const { block, biome, y } = tile.getBlock(index);
  let biomeName: string | null = null;
  if (biome !== 0) {
    const palette = await loadBiomes(world).catch(() => ({}) as Palette);
    const key = palette[String(biome)];
    if (key) biomeName = langName(key);
  }
  return {
    y: block !== 0 ? y + 1 : null,
    biome: biomeName,
  };
}
