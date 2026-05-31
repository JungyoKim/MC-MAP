# MC-MAP

Pl3xMap 백엔드 위에 올리는 커스텀 Minecraft 서버 지도 프론트엔드.
Pl3xMap의 내장 프론트엔드 대신 Next.js + React로 새로 만든 지도 UI.

## 스택

- **Next.js 16** (App Router) + **React 19** + TypeScript
- **react-leaflet** (지도) — Pl3xMap 커스텀 CRS / 역순 줌 / 타일 좌표 복제
- **Tailwind v4** + **HeroUI v3**
- **Zustand** (상태) · 클라 SSE/폴링

## 구조

```
frontend/   Next.js 앱 (지도 UI + Pl3xMap 프록시 API)
reference/  Pl3xMap 원본 소스 (참조용, 미커밋)
SPEC.md     아키텍처 / 데이터 계약 / 구현 결정 기록
```

## 주요 기능

- Pl3xMap 타일 렌더링 + 커스텀 오버레이 UI (다크 테마)
- 플레이어 실시간 표시 (SSE 푸시 + 방향 마커 + 보간), 추적/월드 전환
- 좌표 + 바이옴(blockinfo) 표시, 클릭 복사
- 월드(Overworld/Nether/End) 전환 + 뷰 기억, 전체보기
- 서버 접속 정보 패널

## 개발

```bash
cd frontend
npm install
cp .env.example .env.local   # PL3XMAP_BASE_URL 설정
npm run dev
```

백엔드(Pl3xMap)는 `PL3XMAP_BASE_URL`로 프록시되며 직접 노출되지 않는다.
