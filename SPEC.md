# Pl3xMap 커스텀 프론트엔드 — 확정 스펙

Pl3xMap을 렌더링/데이터 백엔드로만 쓰고, 프론트엔드를 React(Next.js)로 완전히 새로 만든다.

## 인프라

```
브라우저
  ├─ /tiles/*      → (Next.js rewrite, pass-through) → Pl3xMap :8080   [ETag 304 재검증]
  └─ /api/pl3x/*   → Next.js Route Handler (runtime='nodejs')          → Pl3xMap :8080
       ├─ /players  → SSE relay (fan-out: 업스트림 1개 → N 클라)
       ├─ /markers  → 폴링 프록시 (20s)
       └─ /settings → 폴링 프록시 (1회)
```

- **Pl3xMap 백엔드**: `http://10.10.20.10:8080` (LAN). `read-only: true`, 내장 웹서버 off.
- **배포**: Proxmox LXC + Dokploy (앞단 Traefik). Cloudflare Tunnel 안 씀.
- **외부 노출**: 직접 포트포워딩.
- **동시 접속**: 최대 ~100명.
- **로컬 개발**: Node v20.20.1 / npm 10.8.2 (pnpm 없음).

## 실시간 전송 — 확정: SSE relay + 클라 보간

- 데이터가 서버→클라 단방향이라 WebSocket은 오버킬. SSE가 최적.
- 백엔드 SSE 엔드포인트: `GET http://10.10.20.10:8080/sse` (`text/event-stream`, `X-Accel-Buffering: no`).
  - **relay 시 `X-Accel-Buffering: no` 헤더 그대로 전달**, `runtime='nodejs'` 필수(edge 금지).
- fan-out: Next.js가 업스트림 SSE **1개**만 구독 → in-memory broadcast로 클라 N명에게 push. heartbeat 15s.
- **클라 폴백**: `EventSource` 죽으면 TanStack Query 폴링(1.5s)으로 자동 전환.
- 체감 부드러움의 핵심은 전송이 아니라 **클라 마커 보간(rAF로 이전→새 좌표 애니메이션)**.

| 데이터 | 방식 | 주기 |
|---|---|---|
| 플레이어 위치 | SSE relay (fan-out) + 보간 | push (폴백 1.5s) |
| markers.json | 폴링 | 20s |
| world settings.json | 폴링 | 마운트 1회 |
| 전역 settings.json | 폴링 | 마운트 1회 |

## 타일 — 확정: rewrite pass-through + ETag + 더블버퍼

- `next.config.js` rewrite: `/tiles/:path*` → `${PL3XMAP_BASE_URL}/tiles/:path*` (Node 통과 안 함).
- 캐시: `Cache-Control: public, max-age=0, must-revalidate` + Pl3xMap ETag 통과 → 304 재검증.
- Leaflet: `keepBuffer` 크게, 줌 fade, **더블 타일레이어 번갈아 redraw**로 갱신 깜빡임 제거.

## 백엔드 데이터 계약 (reference/Pl3xMap/webmap 역설계 + 라이브 검증)

### CRS / 좌표
- `L.CRS.Simple` 확장, `transformation: new L.Transformation(1, 0, 1, 0)` (표준 Simple과 달리 y축 안 뒤집음).
- map: `center: [0,0]`, `preferCanvas: true`, `attributionControl: true`.
- 스케일: `scale = 1 / 2^maxZoomOut`.
- 블록좌표 → LatLng: `toLatLng([x,z]) = L.latLng(z*scale, x*scale)` — **lat=z, lng=x**.
- 마커 중앙정렬: `x+0.5, z+0.5`.

### 타일 레이어 (ReversedZoomTileLayer)
- URL: `tiles/{world}/{z}/{renderer.label}/{x}_{y}.{format}` — **z가 renderer 앞**, `{x}_{y}` 언더스코어, format=png.
- `tileSize: 512` (region = 512x512 블록), `noWrap: true`.
- `minNativeZoom: 0` (항상), `maxNativeZoom: world.zoom.maxOut`.
- `maxZoom: maxOut + maxIn`, `zoomOffset: -maxIn`.
- urlZoom 계산: `(maxZoom - leafletZoom) + zoomOffset`.
- 현재 인스턴스 world: `zoom.default=0, maxOut=3, maxIn=2`.

### 엔드포인트 (web/ 루트 기준)
- `tiles/settings.json` — 전역: format, maxPlayers, lang(라벨/문구), zoom(snap/delta/wheel), worldSettings[].
- `tiles/{world}/settings.json` — 월드별: name, tileUpdateInterval, spawn{x,z}, center{x,z}, zoom{default,maxOut,maxIn}, ui{link,coords,blockinfo,attribution}.
- `tiles/{world}/markers.json` — 레이어 메타: key,label,updateInterval,showControls,defaultHidden,priority,zIndex,(pane,css).
- `tiles/{world}/players.json` — 플레이어 배열.
- `sse` (루트) — 플레이어 실시간 push.

### 현재 인스턴스 구성
- format png, maxPlayers 50, zoom snap/delta 0.25.
- 월드: `world`(Overworld, renderer **VintageStory**, label `vintage_story`), `world_nether`(Basic), `world_the_end`(Basic).
- 마커 레이어: `pl3xmap_spawn`(Spawn), `warp_markers`(Warps), `pl3xmap_players`(Players, pane=nameplates, 픽셀레이트 head CSS).
- world UI 위치: link 우하단, coords 하단중앙, blockinfo 좌하단.

### 플레이어 데이터 shape
```ts
interface Player {
  name: string;
  uuid: string;
  displayName: string;
  world: string;        // 숨김 시 없음
  position?: { x: number; z: number };  // 숨김 시 없음
}
```

## 프론트 스택 (확정 — frontend/ 에 스캐폴드 완료)
- Next.js **16.2.6** (App Router, Turbopack) + React **19.2.4** + TypeScript 5
- **Tailwind v4** (CSS-first, JS config 없음 / postcss `@tailwindcss/postcss`)
- **HeroUI v3.1.0** (`@heroui/react` + `@heroui/styles`) — v3는 React19/Tailwindv4/RSC 전용, stable. CSS-first라 Provider/플러그인 불필요. globals.css에 `@import "tailwindcss"; @import "@heroui/styles";`
- react-leaflet **5.0.0** + leaflet **1.9.4** (v5가 React19 지원) — 위 CRS/타일 계약 그대로 복제
- Zustand **5** (월드/플레이어/팔로우 상태)
- TanStack Query **5** (폴링 + SSE 폴백)

### Next 16 주의점 (frontend/AGENTS.md 경고 — 코드 전 node_modules/next/dist/docs/ 참조)
- 동적 route params가 Promise: `const { p } = await ctx.params`, 타입 `RouteContext<'/api/.../[p]'>`.
- Route Handler 기본 nodejs 런타임 + 캐시 안 됨. SSE 라우트엔 `export const dynamic = 'force-dynamic'`.
- rewrites 문법 기존과 동일, 외부 destination 가능 (타일 pass-through 적용 완료).

## 빌드 상태 (현재)
- `frontend/` 스캐폴드 + 의존성 설치 + `npm run build` 통과.
- 완료: next.config 타일 rewrite, globals.css(HeroUI+풀스크린), `.env.local`/`.env.example`(PL3XMAP_BASE_URL), `lib/pl3x/types.ts`(데이터 계약), `lib/pl3x/coords.ts`(CRS/타일/역순줌 수학), `lib/pl3x/server.ts`(서버 페치 헬퍼).
- **지도 완료** ✅ — `components/map/{ReversedZoomTileLayer,MapView,MapClient}.tsx` + `app/page.tsx`(서버 settings 페치). 커스텀 CRS + 역순줌 + 타일 경로 검증됨 (브라우저에서 VintageStory 타일 정상 렌더, 콘솔 에러 0). 현재 leaflet 기본 줌컨트롤/attribution 사용 중(나중에 커스텀 오버레이로 교체).
- **플레이어 SSE 완료** ✅ — `lib/pl3x/sse-hub.ts`(fan-out 허브: 업스트림 /sse 1개 → N 클라, \n\n 프레임 재조립, 15s heartbeat, idle 시 정리), `app/api/pl3x/sse/route.ts`(relay + 접속 시 스냅샷, X-Accel-Buffering:no), `lib/store/players.ts`(Zustand), `hooks/usePlayerStream.ts`(EventSource + 끊김 시 1.5s 폴링 폴백), `components/map/PlayersLayer.tsx`(명령형 Leaflet 마커 + rAF 보간 LERP 0.18). 브라우저 검증: relay 200/event-stream/스냅샷 정상, 마커 좌표 정확, 보간 ease-out 동작, 콘솔 에러 0. SSE 이벤트는 루트 /sse 의 `settings`(data=전역settings JSON, .players 사용); 폴백은 /tiles/settings.json.
- **월드 전환 완료** ✅ — `components/WorldSelector.tsx`(HeroUI v3 `Tabs`/`TabList`/`Tab`, react-aria 기반 `selectedKey`/`onSelectionChange`; 렌더러가 2개 이상일 때만 렌더러 탭 추가 노출), `components/map/MapClient.tsx`가 worldName/renderer/worldSettings 상태 보유 + 전환 시 `/tiles/{world}/settings.json` 페치 후 `MapView`를 `key={world/renderer}`로 **리마운트**(zoom/center/스케일/타일 URL 일괄 적용). 검증: 탭 3개(Overworld/Nether/End) 렌더, Nether 전환 시 타일 `world_nether/basic`, Overworld 왕복 복원, 콘솔 에러 0.
- HeroUI v3 메모: Provider 불필요(CSS-first). 컴포넌트는 react-aria-components 기반 → `Button`은 `onPress`, `Tabs`는 `Tab id`가 selection key. 편의 export(`Tabs`,`Card`,`Select`,`Spinner`,`Tooltip`,`ToggleButtonGroup`)와 composable parts(`TabsRoot` 등) 둘 다 제공.
- **알려진 caveat**: preview_screenshot 도구가 상시 열린 SSE 연결 때문에 network-idle을 못 잡아 타임아웃됨(앱 버그 아님). 검증은 preview_eval로 DOM/타일 URL 직접 확인하는 방식 사용.
- **오버레이 UI 완료** ✅ — 다크 테마(`<html class="dark">`, HeroUI v3 `.dark`), `lib/store/map.ts`(공유 Leaflet 인스턴스 store; MapView `ref`로 주입, 오버레이는 MapContainer 밖에서 이걸로 지도 제어), `components/overlay/ZoomControl.tsx`(HeroUI Button +/−/리셋, leaflet 기본 zoomControl/attributionControl 끔), `components/overlay/CoordsBox.tsx`(mousemove→블록좌표, 하단중앙), `components/overlay/PlayersPanel.tsx`(우상단, online/max + 목록, 클릭 시 해당 플레이어로 center; 현재 월드+위치 있는 경우만 활성). 오버레이 컨테이너는 항상-다크 고정색(Tailwind dark-variant 미사용). 검증(1280x800 eval): 다크 ON, 좌표박스 mousemove시 `0,-1` 갱신, 4개 오버레이 위치 정확.
- **caveat 2**: 이 preview 환경은 뷰포트가 1px로 갇히고 + SSE 상시연결로 preview_screenshot이 타임아웃. 검증은 preview_resize(1280x800) 후 preview_eval로 geometry/동작 측정. 실제 브라우저(localhost:3000)에선 정상.
- **플레이어 방향 마커 완료** ✅ — yaw는 settings players가 아니라 `pl3xmap_players` 마커 레이어(icon의 `rotationAngle`)에서만 옴. PlayersLayer = 30px 모던 SVG 화살표+점, 위치 LERP 0.18 + yaw LERP 0.25(최단경로), `YAW_OFFSET=180`(사용자가 방향 정확 확인함). 이름은 settings store에서 uuid 매칭(없으면 uuid 앞 8자). 실플레이어(anti_Socrates) 검증: 마커 렌더+회전+실명 표시.
- **플레이어 위치/방향 = SSE 푸시 (폴링 아님)** ✅ — 사용자 선택. `app/api/pl3x/sse/[world]/route.ts`(월드별 relay + 접속 시 pl3xmap_players 스냅샷), sse-hub를 **다중 업스트림**(경로별 hub Map)으로 일반화. `hooks/usePlayerMarkers.ts`가 `/api/pl3x/sse/{world}` EventSource의 `markers` 이벤트(key=pl3xmap_players) 구독→`lib/store/playerMarkers.ts`. 끊기면 1s 폴링 폴백. fan-out으로 100명에서 백엔드 경로당 1연결.
- **월드 뷰 메모리 완료** ✅ — MapClient `viewMemory` ref가 월드별 마지막 {center,zoom} 기억(`captureView()`를 월드/렌더러 변경 직전 호출), 재진입 시 MapView `initialCenter/initialZoom`으로 복원. 검증: Overworld [10,20]z2 설정→Nether 왕복→정확히 복원. 렌더러 변경(리마운트)에도 뷰 보존.
- **좌표 y+바이옴 완료** ✅ — `lib/pl3x/blockinfo.ts`(BlockInfo 바이너리 파싱 + 타일/인덱스 수식 + blocks/biomes 팔레트 캐시 + langName), `CoordsBox`가 mousemove마다 해당 타일 blockinfo 비동기 조회(타일/팔레트 캐시, 80ms throttle, 최신요청 race guard)해서 `x, y, z · Biome` 표시. 검증: 실데이터 (-84,21)→ minY -64, y 69, biome plains; end-to-end CoordsBox "2, 71, 2 · Plains".
- **follow + 다른월드 전환 + 스킨 아바타 완료** ✅ — `lib/store/follow.ts`(followUuid). 패널 플레이어 클릭=follow 토글(PlayersPanel, "추적" 배지/하이라이트, mc-heads 아바타 `https://mc-heads.net/avatar/{uuid}/20` + 실패시 글자 폴백). PlayersLayer rAF가 추적 플레이어를 매 프레임 화면 중앙 고정(`map.setView animate:false`), 지도 mousedown/dragstart 시 추적 해제. MapClient effect가 추적 플레이어 world≠현재면 자동 changeWorld. 실플레이어 검증: 추적 시 마커 dx/dy=0, mousedown 시 해제, Nether→Overworld플레이어 클릭→자동 전환+중앙.
- **마커 레이어 (구현했다가 제거됨)** — Spawn/Warps/Public Homes/World Border 마커 렌더 + 좌하단 토글을 만들었으나 사용자가 불필요하다고 판단 → 전체 삭제(`markers.ts`, `markerLayers.ts`, `useMarkerLayers.ts`, `MarkersLayer.tsx`, `LayersControl.tsx`, `/images` rewrite). 단, World Border 범위는 fit-zoom/타일bounds 계산에 필요해 `MapBounds.tsx`가 `tiles/{world}/markers/pl3xmap_worldborder.json`을 **자체 fetch**(렌더는 안 함)로 사용. (필요 시 git history에서 복원 가능 — 마커 타입/옵션 파싱 로직 포함)
- **남은 후보 전부 완료.** 추가 가능: ellipse 정확 렌더(L.ellipse 플러그인), 마커 클릭/팝업 상호작용 확장, 플레이어 패널 외 지도 마커에도 스킨 머리, tooltip permanent 옵션 등.

- **센터/리셋 버튼 = 전체보기**: ZoomControl ⌖ 버튼이 `map.setView(worldCenter, map.getMinZoom())` → 월드 중심 + 최대 축소(전체). (resetZoom prop 제거)
- **서버 접속 정보 패널**: `components/overlay/ServerInfo.tsx` 우하단 — **카드 전체가 `<button>`**, 클릭 시 `mc.xenv.cc` 복사 + 카드 전체 초록(emerald/85) + "복사"→"복사됨"(1.5s). Java/Bedrock 공통, 베드락 포트 19132는 안내만(베드락 포트칸 분리라 주소만 복사). 아이콘 없음. 접속 정보는 상단 `SERVER` 상수에서 수정.
- **오버레이 일관 다크 스타일**: WorldSelector(커스텀 세그먼트 컨트롤)·ZoomControl(다크 세로 pill)을 HeroUI 대신 plain Tailwind로 재작성해 다른 패널과 동일한 불투명 다크(`bg-neutral-900/85 ring-white/10 backdrop-blur`)로 통일. (HeroUI는 PlayersPanel Button에만 잔존)
- **좌표 클릭 복사**: 지도 클릭 시 그 지점 좌표를 `x y z`(공백 구분, y 없으면 `x z`)로 복사. 피드백은 별도 토스트가 아니라 **좌표 박스 자체가 초록 반투명(rgba(16,185,129,.85))으로 transition + "클릭 복사"→"복사됨"** (1.5s 후 복귀). 복사 피드백도 ref/DOM 으로 처리(리렌더로 좌표 텍스트 초기화 방지). 호버 표시는 window mousemove. `lib/clipboard.ts` 가 navigator.clipboard(secure) → execCommand 폴백(HTTP 대비).
- **첫 진입 시 전체보기**: `MapClient`가 저장된 뷰 없을 때 `fitOnLoad`를 MapView→MapBounds로 전달, MapBounds가 fit 계산 후 `map.fitBounds(world)`로 월드 전체를 맞춤. 페이지 새로고침 시 viewMemory(useRef) 초기화되므로 매 진입마다 적용. 재방문(저장된 뷰 있음)은 복원 우선. 검증: 첫 로드 80타일(전체) vs 기본줌 8타일.

## 지도 UX 개선 (드래그/줌/깜빡임) ✅
- **전체 보기 + snap 제거 (최종)**: `components/map/MapBounds.tsx` — **maxBounds 안 씀**(snap/충돌 원인이라 코드단위 제거). 대신 World Border 마커 범위로: ① `setMinZoom(getBoundsZoom(world.pad(0.05)))` → 축소 최대 = 월드 전체 한눈에. ② 타일 레이어 `options.bounds=world`+redraw → 빈 영역 드래그해도 타일 요청 안 감(요청 낭비 차단). MapView `minZoom=-EXTRA_ZOOM_OUT(-8)`+타일 `minZoom=-8`로 축소 시 native(maxOut) 타일 스케일 표시(그리드 maxNativeZoom 고정→요청 수 불변). 검증: minZoom -2에서 viewSeesWholeWorld=true, hasMaxBounds=false. 길 잃으면 ZoomControl ⌖(리셋)로 복귀. worldborder 없는 월드는 미적용.
  - 경위: maxBounds(viscosity 1.0=경계 충돌, 0=튕김)가 사용자에게 거슬려 제거. 무한 드래그 "맵 분실"은 타일 bounds(빈 곳 안 그림)+리셋 버튼+전체보기 줌으로 대체.
- **fit-zoom clamp 버그 수정**: `getBoundsZoom`은 현재 minZoom으로 결과를 clamp함 → MapContainer minZoom prop이 react-leaflet에서 신뢰성 있게 적용 안 돼(HMR/생성 타이밍) minZoom 0인 채로 계산되어 fit이 0으로 잘림(=한눈에 안 보임). MapBounds에서 `setMinZoom(-20)`으로 임시 unclamp 후 `getBoundsZoom` 계산 → 실제 fit으로 `setMinZoom`. 검증: 오버월드 minZoom -2, 최대 축소 시 전체 보임.
- **월드 전환 시 타일 미로드/검은화면 수정**: ① 전환=리마운트 후 컨테이너 크기 미확정 → MapBounds가 mount 시 `requestAnimationFrame(()=>map.invalidateSize())`. ② **타일 `options.bounds` 제거** — 축소(scaled) 상태에서 전환 시 역순줌+bounds 투영 불일치로 "표시할 타일 없음" 오판 → 검은화면. bounds 이득(빈 영역 요청 차단)보다 버그가 커서 삭제(maxBounds도 없으니 일관). 검증: 축소 -2에서 전 월드 전환 모두 타일 로드(검은화면 0).
- **월드 전환 시 "갑자기 확대"(오버월드만) 최종 수정**: 근본 원인은 **React Strict Mode 의 dev 더블마운트** — leaflet 맵이 racy하게 생성/파괴되며 복원 줌(-1.75)이 0으로 꼬임. 오버월드만 그런 건 fit이 음수(-1.75)라 clamp 영향이 보였기 때문(네더/엔드 fit은 0). 해결: `next.config.ts reactStrictMode: false`(leaflet+strict 알려진 비호환). 부수 방어: `InitialView.tsx`(마운트 1회 setMinZoom+setView로 복원 뷰 결정 적용), MapBounds에서 getBoundsZoom 전 동기 `invalidateSize`(localhost fetch가 rAF보다 빨라 크기 미확정 방지) + `setMinZoom(Math.min(fit, 현재줌))`(복원 뷰 clamp 가드). 검증: 오버월드 -1.75 ↔ 네더 3회 왕복 모두 -1.75 일관 복원. (인라인 ref setView 시도는 매 렌더 재실행 thrash로 폐기.)
- **줌 깜빡임**: (한때 maptiles 캐시 라우트 + updateWhenZooming:false + keepBuffer:6 추가했으나) 사용자가 깜빡임 안 거슬리고 오버헤드만 늘린다고 판단 → **순정 복원**. 타일은 `/tiles` rewrite 직접, keepBuffer 4 기본. (maptiles 라우트 삭제)
- **CoordsBox는 window mousemove + `map.mouseEventToLatLng`** 로 추적 → 오버레이 UI 위에 마우스가 있어도 커서 아래 좌표가 계속 표시됨. y(높이) 데이터 없으면 `-` 표시(이전 `?`). 드래그 끊김 방지 위해 ref+DOM 직접 갱신(리렌더 0). `maxBoundsViscosity`는 1.0 유지(경계 튕김 없이 딱 멈춤; 경계 안 드래그엔 영향 없음 — 0으로 낮췄더니 경계서 elastic 튕김 발생해 되돌림).

## blockinfo (좌표 y+바이옴) 구현 메모 (완료됨, 참고용)
- 데이터(모두 /tiles rewrite로 접근, Content-Encoding: gzip → fetch가 자동 해제):
  - 블록 팔레트(전역): `/tiles/blocks.gz` → JSON `{id:"minecraft:..."}`.
  - 바이옴 팔레트(월드별): `/tiles/{world}/biomes.gz` → JSON `{id:"minecraft:river",...}`.
  - blockinfo 타일(바이너리): `/tiles/{world}/{zoom}/blockinfo/{fileX}_{fileZ}.pl3xmap.gz` → `fetch().arrayBuffer()`가 해제된 바이너리.
- 파싱(reference Block.ts/BlockInfo.ts): minY = bigendian int @byte8. block index n → packed int @ (12 + n*4). packed: block=`>>>21`(11bit), biome=`(packed>>>12)&0x1FF`(9bit), yPos=`packed&0xFFF`(12bit), 실제 y = yPos+minY (표시 시 +1). block/biome가 0이면 unknown 취급(reference 동작).
- 타일/인덱스 수식(BlockInfoControl.ts): currentZoom=clamp(maxOut-leafletZoom,0,maxOut); step=1<<zoom; regionX=x>>9; fileX=floor(regionX/step); tileX=(x/step)&511; index=tileZ*512+tileX.
- 이름 포맷 getLangName: "minecraft:foo_bar"→namespace 제거→마지막 '.' 뒤→'_'→공백→Title Case.
- CoordsBox에 mousemove 시 해당 타일 blockinfo 비동기 fetch(타일별 캐시)+팔레트로 x/y/z + biome 표시.
- 로컬 dev 실행: 루트 `.claude/launch.json`의 `frontend` 설정(preview MCP) 또는 `npm --prefix frontend run dev`.

## 참고
- reference 소스: `reference/Pl3xMap/webmap` (webpack + 바닐라 TS + Leaflet, 갈아엎을 대상이지만 계약 참조용).
