// iOS(WebKit) 감지. iOS 는 leaflet 음수 줌 + GPU 레이어에서 크래시/렌더 문제가 있어
// 줌 범위를 native(0) 이상으로 제한하는 데 사용. (클라에서만 호출)
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ 는 Macintosh 로 위장하지만 터치가 있음
    (/Macintosh/.test(ua) && "ontouchend" in document)
  );
}
