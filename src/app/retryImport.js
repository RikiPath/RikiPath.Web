// Lazy route chunks can fail transiently: Vite dev re-optimizing a newly discovered dependency
// ("Outdated Optimize Dep" / "Failed to fetch dynamically imported module") or a network blip.
// Retry once after a short pause before letting the ErrorBoundary show "Đã có phiên bản mới".
// Never reloads the page automatically, so nothing the learner typed is lost; a genuinely stale
// deployment still surfaces the manual "Tải lại trang" button.

export const CHUNK_ERROR_RE = /Loading chunk|dynamically imported module|Importing a module script failed|Outdated Optimize Dep/i;

export function isChunkLoadError(error) {
  return CHUNK_ERROR_RE.test(String(error?.message ?? error ?? ''));
}

export async function retryImport(loader, { retries = 1, delayMs = 600, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await loader();
    } catch (error) {
      if (attempt >= retries || !isChunkLoadError(error)) throw error;
      attempt += 1;
      await wait(delayMs);
    }
  }
}
