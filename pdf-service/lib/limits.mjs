/**
 * Concurrency and rate limiting, with no dependencies.
 *
 * Chromium is the scarce resource. Each render holds a browser page for one to
 * several seconds and a few hundred megabytes, so the service needs two
 * different guards: one for how many renders run at once (the semaphore) and
 * one for how fast a single client may ask (the rate limiter). Without the
 * first, a burst exhausts memory; without the second, one client starves
 * everyone else of the slots the first one hands out.
 */

export class QueueTimeoutError extends Error {
  constructor() {
    super('render queue is full');
    this.name = 'QueueTimeoutError';
  }
}

/**
 * A counting semaphore with a bounded wait.
 *
 * Waiters are served first in, first out. A waiter that times out is removed
 * from the queue rather than left to be granted a slot nobody is holding — the
 * classic leak in hand-rolled semaphores, where a timed-out caller's slot is
 * later "released" to no one and capacity silently shrinks.
 */
export class Semaphore {
  #available;
  #queue = [];

  constructor(size) {
    if (!Number.isInteger(size) || size < 1) throw new Error('semaphore size must be a positive integer');
    this.size = size;
    this.#available = size;
  }

  get inFlight() {
    return this.size - this.#available;
  }

  get waiting() {
    return this.#queue.length;
  }

  acquire(timeoutMs) {
    if (this.#available > 0) {
      this.#available -= 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const waiter = { resolve, timer: null };
      waiter.timer = setTimeout(() => {
        const i = this.#queue.indexOf(waiter);
        if (i !== -1) this.#queue.splice(i, 1);
        reject(new QueueTimeoutError());
      }, timeoutMs);
      this.#queue.push(waiter);
    });
  }

  release() {
    const next = this.#queue.shift();
    if (next) {
      // Hand the slot straight to the next waiter; the count does not change.
      clearTimeout(next.timer);
      next.resolve();
      return;
    }
    if (this.#available >= this.size) throw new Error('semaphore released more times than acquired');
    this.#available += 1;
  }

  async run(timeoutMs, fn) {
    await this.acquire(timeoutMs);
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Fixed-window rate limiter keyed by client.
 *
 * Fixed rather than sliding: the window only has to stop sustained abuse of an
 * expensive endpoint, and the simple version is easy to reason about. Stale
 * windows are swept so a long-running process does not accumulate one entry
 * per IP it has ever seen.
 */
export class RateLimiter {
  #windows = new Map();

  constructor({ limit, windowMs = 60_000, now = () => Date.now() }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** Returns `{ allowed, retryAfterSeconds }`. */
  check(key) {
    const t = this.now();
    let w = this.#windows.get(key);
    if (!w || t - w.start >= this.windowMs) {
      w = { start: t, count: 0 };
      this.#windows.set(key, w);
    }
    w.count += 1;
    if (w.count <= this.limit) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((w.start + this.windowMs - t) / 1000)),
    };
  }

  sweep() {
    const t = this.now();
    for (const [key, w] of this.#windows) {
      if (t - w.start >= this.windowMs) this.#windows.delete(key);
    }
  }

  get size() {
    return this.#windows.size;
  }
}
