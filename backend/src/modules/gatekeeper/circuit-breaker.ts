import { redis } from '../../config/redis.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('circuit-breaker');

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes to close from half-open
  timeout: number;               // Seconds before trying half-open
  windowSize: number;            // Seconds for failure window
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30,
  windowSize: 60,
};

export class CircuitBreaker {
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get circuit state for a service
   */
  async getState(serviceName: string): Promise<CircuitState> {
    const stateKey = `circuit:${serviceName}:state`;
    const state = await redis.get(stateKey);
    return (state as CircuitState) || 'CLOSED';
  }

  /**
   * Check if circuit allows request
   */
  async canExecute(serviceName: string): Promise<boolean> {
    const state = await this.getState(serviceName);

    switch (state) {
      case 'CLOSED':
        return true;
      case 'OPEN': {
      case 'OPEN':
        // Check if timeout has passed
        const openedAt = await redis.get(`circuit:${serviceName}:openedAt`);
        if (openedAt) {
          const elapsed = (Date.now() - parseInt(openedAt, 10)) / 1000;
          if (elapsed >= this.config.timeout) {
            // Transition to half-open
            await this.setState(serviceName, 'HALF_OPEN');
            logger.info({ serviceName }, 'Circuit transitioned to HALF_OPEN');
            return true;
          }
        }
        return false;
      }
      case 'HALF_OPEN':
        return true;
      default:
        return true;
    }
  }

  /**
   * Record a successful call
   */
  async recordSuccess(serviceName: string): Promise<void> {
    const state = await this.getState(serviceName);

    if (state === 'HALF_OPEN') {
      const successKey = `circuit:${serviceName}:halfOpenSuccesses`;
      const successes = await redis.incr(successKey);
      await redis.expire(successKey, this.config.windowSize);

      if (successes >= this.config.successThreshold) {
        await this.setState(serviceName, 'CLOSED');
        await this.resetCounters(serviceName);
        logger.info({ serviceName }, 'Circuit CLOSED after successful recovery');
      }
    }
  }

  /**
   * Record a failed call
   */
  async recordFailure(serviceName: string): Promise<void> {
    const state = await this.getState(serviceName);

    if (state === 'HALF_OPEN') {
      // Immediately open on failure in half-open state
      await this.setState(serviceName, 'OPEN');
      await redis.set(`circuit:${serviceName}:openedAt`, Date.now().toString());
      logger.warn({ serviceName }, 'Circuit OPENED from HALF_OPEN after failure');
      return;
    }

    if (state === 'CLOSED') {
      const failureKey = `circuit:${serviceName}:failures`;
      const failures = await redis.incr(failureKey);
      await redis.expire(failureKey, this.config.windowSize);

      if (failures >= this.config.failureThreshold) {
        await this.setState(serviceName, 'OPEN');
        await redis.set(`circuit:${serviceName}:openedAt`, Date.now().toString());
        logger.warn({ serviceName, failures }, 'Circuit OPENED after threshold exceeded');
      }
    }
  }

  /**
   * Force circuit state (for admin/testing)
   */
  async setState(serviceName: string, state: CircuitState): Promise<void> {
    const stateKey = `circuit:${serviceName}:state`;
    await redis.set(stateKey, state);
    
    if (state === 'CLOSED') {
      await this.resetCounters(serviceName);
    }
  }

  /**
   * Get circuit status for monitoring
   */
  async getStatus(serviceName: string): Promise<{
    state: CircuitState;
    failures: number;
    lastFailure: string | null;
    openedAt: string | null;
  }> {
    const [state, failures, openedAt] = await Promise.all([
      this.getState(serviceName),
      redis.get(`circuit:${serviceName}:failures`),
      redis.get(`circuit:${serviceName}:openedAt`),
    ]);

    return {
      state,
      failures: failures ? parseInt(failures, 10) : 0,
      lastFailure: null, // Could track this if needed
      openedAt: openedAt ? new Date(parseInt(openedAt, 10)).toISOString() : null,
    };
  }

  private async resetCounters(serviceName: string): Promise<void> {
    await redis.del(
      `circuit:${serviceName}:failures`,
      `circuit:${serviceName}:halfOpenSuccesses`,
      `circuit:${serviceName}:openedAt`
    );
  }
}

// Pre-configured circuit breakers for different services
export const whatsappCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60,
  windowSize: 120,
});

export const groqCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 1,
  timeout: 30,
  windowSize: 60,
});

export const googleCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 45,
  windowSize: 90,
});
