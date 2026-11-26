import { HttpException, HttpStatus } from '@nestjs/common';
import { coded, ErrorCode } from '../errors/coded';

interface Window {
  failures: number;
  startedAt: number;
}

/**
 * Counts failed guesses (a password, a PIN) per key, in memory. After
 * [maxFailures] within [windowMs] the key is refused until the window ends;
 * a success clears it. Keyed by account rather than address: behind the web
 * app's proxy every request comes from the same one.
 */
export class AttemptLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** Throws 429 while [key] has used up its guesses. */
  check(key: string, now = Date.now()): void {
    const window = this.current(key, now);
    if (!window || window.failures < this.maxFailures) return;
    const minutes = Math.ceil(
      (window.startedAt + this.windowMs - now) / 60_000,
    );
    throw coded(
      new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
      ErrorCode.TOO_MANY_ATTEMPTS,
      { minutes },
    );
  }

  fail(key: string, now = Date.now()): void {
    const window = this.current(key, now);
    if (window) {
      window.failures++;
      return;
    }
    if (this.windows.size >= this.maxKeys) this.prune(now);
    // Still full of live windows: forget the oldest rather than grow.
    if (this.windows.size >= this.maxKeys) {
      const oldest = this.windows.keys().next().value;
      if (oldest !== undefined) this.windows.delete(oldest);
    }
    this.windows.set(key, { failures: 1, startedAt: now });
  }

  succeed(key: string): void {
    this.windows.delete(key);
  }

  private current(key: string, now: number): Window | undefined {
    const window = this.windows.get(key);
    if (window && now - window.startedAt >= this.windowMs) {
      this.windows.delete(key);
      return undefined;
    }
    return window;
  }

  private prune(now: number): void {
    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= this.windowMs) this.windows.delete(key);
    }
  }
}
