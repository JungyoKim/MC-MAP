// iOS(WebKit) 감지. iOS WebKit 은 leaflet 음수 줌(타일 per-tile 3D 변환 스케일)에서
// 크래시/렌더 문제가 있어, iOS 에서만 줌 범위를 native(0) 이상으로 제한한다. (클라 전용)
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ 는 Macintosh 로 위장하지만 터치가 있음
    (/Macintosh/.test(ua) && "ontouchend" in document)
  );
}
