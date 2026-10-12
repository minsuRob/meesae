/**
 * 웹 글꼴: Pretendard Variable (dynamic subset, jsDelivr). 한 번만 <link> 를 붙인다.
 * 오프라인이면 시스템 글꼴로 떨어진다 (font-display: swap).
 */

const HREF = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

export function loadFonts(): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${HREF}"]`)) return;
  const pre = document.createElement('link');
  pre.rel = 'preconnect';
  pre.href = 'https://cdn.jsdelivr.net';
  pre.crossOrigin = 'anonymous';
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = HREF;
  document.head.append(pre, link);
}
