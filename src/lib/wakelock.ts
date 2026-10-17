/**
 * Screen Wake Lock API manager.
 * Prevents mobile devices and tablets from sleeping/turning the screen black during a poker game.
 */

class WakeLockManager {
  private sentinel: any = null;
  private isRequested = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          this.request();
        }
      });
    }
  }

  public async request(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (this.sentinel && !this.sentinel.released) {
        return true;
      }
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      return true;
    } catch (err) {
      console.warn('[WakeLock] Could not acquire screen wake lock:', err);
      return false;
    }
  }

  public async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (err) {
        console.warn('[WakeLock] Error releasing wake lock:', err);
      }
      this.sentinel = null;
    }
  }

  public isActive(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }
}

export const wakeLock = new WakeLockManager();

