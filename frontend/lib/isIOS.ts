// iOS(WebKit) 감지. iOS 는 음수 줌(전체보기)에서 메모리/GPU 한계에 너무 가까워 불안정 →
// iOS 에서만 줌 범위를 native(0) 이상으로 제한해 안정성 확보. (클라 전용)
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ 는 Macintosh 로 위장하지만 터치가 있음
    (/Macintosh/.test(ua) && "ontouchend" in document)
  );
}
