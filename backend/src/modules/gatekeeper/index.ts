// Gatekeeper module - Security and rate limiting
export { rateLimiter, type RateLimitResult } from './rate-limiter.js';
export { 
  CircuitBreaker, 
  whatsappCircuitBreaker, 
  groqCircuitBreaker, 
  googleCircuitBreaker,
  type CircuitState,
  type CircuitBreakerConfig,
} from './circuit-breaker.js';
export { tenantGuard, type TenantGuardResult } from './tenant-guard.js';
export { ddosProtection, type DDoSCheckResult } from './ddos-protection.js';
export {
  ddosMiddleware,
  apiRateLimitMiddleware,
  outboundMessageRateLimitMiddleware,
  tenantStatusMiddleware,
  webhookDDoSMiddleware,
  gatekeeperMiddleware,
  messageSendingGatekeeper,
} from './gatekeeper.middleware.js';
