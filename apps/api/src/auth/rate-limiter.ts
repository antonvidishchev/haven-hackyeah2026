/** In-memory fixed-window limiter: at most `limit` hits per key per window. */
export class RateLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** True while the key has used up its window, without recording a hit. */
  blocked(key: string): boolean {
    const current = this.windows.get(key);
    return !!current && this.now() - current.startedAt < this.windowMs && current.count >= this.limit;
  }

  /** Records a hit; false when the key is over the limit. */
  hit(key: string): boolean {
    const now = this.now();
    const current = this.windows.get(key);
    if (!current || now - current.startedAt >= this.windowMs) {
      this.prune(now);
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= this.limit;
  }

  private prune(now: number) {
    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= this.windowMs) this.windows.delete(key);
    }
  }
}
