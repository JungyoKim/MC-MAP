// Pl3xMap 백엔드 JSON 데이터 계약.
// reference/Pl3xMap/webmap 역설계 + 10.10.20.10:8080 라이브 검증 기준. (SPEC.md 참조)

/** tiles/settings.json — 전역 설정 */
export interface GlobalSettings {
  format: string; // "png"
  maxPlayers: number;
  lang: Lang;
  zoom: {
    snap: number;
    delta: number;
    wheel: number;
  };
  players: Player[];
  worldSettings: WorldListEntry[];
}

export interface Lang {
  title: string;
  langFile: string;
  blockInfo: { label: string; value: string; unknown: { block: string; biome: string } };
  coords: { value: string; label: string };
  link: { value: string; label: string };
  layers: { value: string; label: string };
  markers: { value: string; label: string };
  players: { value: string; label: string };
  worlds: { value: string; label: string };
}

/** 전역 settings 안의 월드 요약 + 렌더러 목록 */
export interface WorldListEntry {
  name: string; // "world"
  displayName: string; // "Overworld"
  type: "overworld" | "nether" | "the_end" | string;
  order: number;
  renderers: RendererEntry[];
}

export interface RendererEntry {
  label: string; // 타일 URL에 쓰이는 값, 예: "vintage_story"
  value: string; // 내부 식별자, 예: "VintageStory"
  icon: string; // 예: "overworld_basic"
}

/** tiles/{world}/settings.json — 월드별 설정 */
export interface WorldSettings {
  name: string;
  tileUpdateInterval: number; // 초
  spawn: { x: number; z: number };
  center: { x: number; z: number };
  zoom: { default: number; maxOut: number; maxIn: number };
  ui: {
    link: UiPosition;
    coords: UiPosition;
    blockinfo: UiPosition;
    attribution: boolean;
  };
}

export type UiPosition =
  | "topleft"
  | "topcenter"
  | "topright"
  | "bottomleft"
  | "bottomcenter"
  | "bottomright";

/** tiles/{world}/markers.json — 마커 레이어 메타 (배열) */
export interface MarkerLayer {
  key: string; // "pl3xmap_spawn"
  label: string; // "Spawn"
  updateInterval: number; // 초, 0이면 갱신 안 함
  showControls: boolean;
  defaultHidden: boolean;
  priority: number;
  zIndex: number;
  pane?: string; // 예: "nameplates"
  css?: string;
}

/** tiles/{world}/players.json 항목 및 SSE player 이벤트 payload */
export interface Player {
  name: string;
  uuid: string;
  displayName: string;
  world?: string; // 월드 숨김 시 없음
  position?: { x: number; z: number }; // 위치 숨김 시 없음
}
