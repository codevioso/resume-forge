import { chromium } from 'playwright';

/** Must match `src/constants/pdfExport.ts`. */
export const STORAGE_KEY = 'resume-forge-pdf-export';

/**
 * Counts pages in a PDF Chromium produced.
 *
 * Matches page objects (`/Type /Page`) and not the page-tree root
 * (`/Type /Pages`). Good enough for Chromium's own output, which is the only
 * input it ever sees; it is used for logging and a response header, never for
 * anything that decides correctness.
 */
export function countPdfPages(bytes) {
  const text = Buffer.from(bytes).toString('latin1');
  const matches = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return matches ? matches.length : 0;
}

export class RenderError extends Error {
  constructor(message, { status = 500 } = {}) {
    super(message);
    this.name = 'RenderError';
    this.status = status;
  }
}

/**
 * Owns the one Chromium process and renders snapshots to PDF.
 *
 * The previous service launched and killed a browser for every request — one
 * to two seconds and a few hundred megabytes, per export. One warm browser
 * with a fresh `BrowserContext` per job costs milliseconds, and a context is
 * still a hard isolation boundary: no cookies, storage or cache survive from
 * one user's resume into the next.
 */
export class Renderer {
  #browser = null;
  #launching = null;
  #closed = false;

  constructor({ renderOrigin, printPath, renderTimeoutMs, logger = console }) {
    this.renderOrigin = renderOrigin;
    this.printUrl = new URL(printPath, renderOrigin).href;
    this.renderTimeoutMs = renderTimeoutMs;
    this.logger = logger;
  }

  get connected() {
    return Boolean(this.#browser?.isConnected());
  }

  /**
   * Returns a live browser, launching one if needed.
   *
   * Single-flight: concurrent callers that find no browser share one launch
   * rather than each starting their own. A crashed browser is noticed through
   * `isConnected()` and replaced on the next render instead of failing every
   * request until the container is restarted.
   */
  async #getBrowser() {
    if (this.#closed) throw new RenderError('renderer is shutting down', { status: 503 });
    if (this.#browser?.isConnected()) return this.#browser;
    if (!this.#launching) {
      this.#launching = chromium
        .launch({
          headless: true,
          // Playwright launches Chromium *without* its own sandbox by default
          // (`chromiumSandbox: false`), and turning it on inside Docker needs a
          // custom seccomp profile or SYS_ADMIN. So isolation here comes from
          // around the browser, not inside it: a non-root container user, no
          // added capabilities, a read-only root filesystem, and the network
          // wall below that refuses every origin but the render origin. Do not
          // relax those on the assumption that Chromium is sandboxing itself.
          //
          // /dev/shm is 64 MB in Docker by default, which crashes Chromium on
          // large pages, so shared memory is moved to /tmp.
          args: ['--disable-dev-shm-usage'],
        })
        .then((browser) => {
          browser.on('disconnected', () => {
            if (this.#browser === browser) this.#browser = null;
            if (!this.#closed) this.logger.warn?.('[pdf-service] browser disconnected; will relaunch on next render');
          });
          this.#browser = browser;
          return browser;
        })
        .finally(() => {
          this.#launching = null;
        });
    }
    return this.#launching;
  }

  /** Launches the browser ahead of the first request, so it is not the user who waits. */
  async warmUp() {
    await this.#getBrowser();
  }

  async render(snapshot) {
    const browser = await this.#getBrowser();
    const context = await browser.newContext({
      viewport: { width: 794, height: 1123 },
      deviceScaleFactor: 1,
      // No downloads, no permissions prompts, no service workers carried over.
      acceptDownloads: false,
      serviceWorkers: 'block',
    });

    try {
      // The second wall. Validation already refuses non-inline photos, but the
      // page is still a real browser running the app's JavaScript, so every
      // request that is not to the render origin is refused here too. This is
      // also what guarantees the PDF never depends on a third-party CDN: a font
      // that fails to load renders a different document, silently.
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        let origin;
        try {
          origin = new URL(url).origin;
        } catch {
          return route.abort('blockedbyclient');
        }
        if (origin === this.renderOrigin) return route.continue();
        return route.abort('blockedbyclient');
      });

      await context.addInitScript(
        ({ key, data }) => {
          window.sessionStorage.setItem(key, JSON.stringify(data));
        },
        { key: STORAGE_KEY, data: snapshot },
      );

      const page = await context.newPage();
      page.setDefaultTimeout(this.renderTimeoutMs);
      page.setDefaultNavigationTimeout(this.renderTimeoutMs);

      const response = await page.goto(this.printUrl, { waitUntil: 'load' });
      if (!response || !response.ok()) {
        throw new RenderError(
          `print page returned ${response ? response.status() : 'no response'} from ${this.printUrl}`,
          { status: 502 },
        );
      }

      // Wait for whichever marker appears first. PrintPage sets the error
      // marker when it cannot read the snapshot; waiting only for the ready
      // marker would turn that into a 30 second timeout with no explanation.
      const marker = await page.waitForSelector('[data-print-ready="true"], [data-print-error="true"]');
      if ((await marker.getAttribute('data-print-error')) === 'true') {
        throw new RenderError('print page could not read the snapshot', { status: 502 });
      }

      const pdf = await page.pdf({
        // Page size and margins come from the document's own @page rule, so
        // the template — not this service — decides how the page is laid out.
        preferCSSPageSize: true,
        printBackground: true,
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      return { pdf, pages: countPdfPages(pdf) };
    } finally {
      await context.close().catch(() => {});
    }
  }

  async close() {
    this.#closed = true;
    const browser = this.#browser ?? (await this.#launching?.catch(() => null));
    this.#browser = null;
    await browser?.close().catch(() => {});
  }
}
