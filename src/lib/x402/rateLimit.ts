import "server-only";

import { RateLimiterMemory } from "rate-limiter-flexible";

export const x402PreflightLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

export const x402SettleLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});
