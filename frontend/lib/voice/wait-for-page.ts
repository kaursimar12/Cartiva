/** How long a page change may take before we stop waiting (dev mode compiles pages on first visit). */
const MAX_WAIT_MS = 4000;
/** Time for the page-enter transition (globals.css "page transitions") to settle. */
const SETTLE_MS = 450;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** The path and query of a URL, normalised, e.g. "/search?q=milk". */
function target(url: string): string {
  const u = new URL(url, window.location.origin);
  return u.pathname + u.search;
}

/**
 * Resolves once the browser shows `url` and the new page has painted (or after MAX_WAIT_MS),
 * so a voice action only reports back when the shopper can actually see the result.
 */
export async function waitForPage(url: string): Promise<void> {
  const wanted = target(url);
  const started = performance.now();
  while (window.location.pathname + window.location.search !== wanted) {
    if (performance.now() - started > MAX_WAIT_MS) return;
    await nextFrame();
  }
  // The URL changes when React commits the new page; give it two frames to paint, then let the
  // enter animation settle.
  await nextFrame();
  await nextFrame();
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}
