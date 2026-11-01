const DAY_MS = 24 * 60 * 60 * 1000;

interface Window {
  /** Game timer of the window's first ATM action. */
  start: number;
  total: number;
}

/**
 * What a character moved through ATMs in the last 24 h, by character id (a reconnect keeps it, a restart of
 * ai-banking clears it). A window opens with the first ATM action and closes 24 h later; ended windows are swept when
 * the map has doubled since the last sweep.
 */
export class AtmAllowance {
  private readonly windows = new Map<number, Window>();
  private sweepAt = 64;

  /** Amount the character may still move through ATMs under `daily`. */
  left(charId: number, daily: number): number {
    return Math.max(0, daily - this.current(charId));
  }

  /** Counts a done ATM action. */
  spend(charId: number, amount: number): void {
    const window = this.windows.get(charId);
    if (window && GetGameTimer() - window.start < DAY_MS) {
      window.total += amount;
      return;
    }
    if (this.windows.size >= this.sweepAt) this.sweep();
    this.windows.set(charId, { start: GetGameTimer(), total: amount });
  }

  private current(charId: number): number {
    const window = this.windows.get(charId);
    if (!window) return 0;
    if (GetGameTimer() - window.start < DAY_MS) return window.total;
    this.windows.delete(charId);
    return 0;
  }

  private sweep(): void {
    const now = GetGameTimer();
    for (const [id, window] of this.windows)
      if (now - window.start >= DAY_MS) this.windows.delete(id);
    this.sweepAt = Math.max(64, this.windows.size * 2);
  }
}
