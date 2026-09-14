declare global {
  interface Window {
    serviceWorker?: ServiceWorkerContainer;
  }
}

/** Register a read-only app-shell service worker in production only. */
export function registerSW(): void {
  if (import.meta.env?.DEV) return;
  if (!('serviceWorker' in window)) return;

  window.addEventListener('load', () => {
    void window.serviceWorker?.register('/sw.js').catch(() => {
      // service workers may be unavailable or blocked on some mobile browsers
    });
  });
}
