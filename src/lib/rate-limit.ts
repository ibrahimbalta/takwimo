// Sliding-window rate limiter with in-memory fallback and optional Upstash Redis REST support
// for multi-instance production deployments (e.g. Firebase App Hosting maxInstances > 1).

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  backend?: "MEMORY" | "REDIS";
}

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((ts) => ts > windowStart);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, oldest + windowMs - now),
      backend: "MEMORY",
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetInMs: windowMs,
    backend: "MEMORY",
  };
}

/**
 * Distributed rate limiter using Upstash Redis REST API when configured,
 * seamlessly falling back to in-memory sliding window when Redis env vars are absent.
 */
export async function checkRateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return checkRateLimit(key, maxRequests, windowMs);
  }

  try {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const redisKey = `takvimo:rl:${key}`;

    const pipelineRes = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSeconds, "NX"],
        ["TTL", redisKey],
      ]),
    });

    if (!pipelineRes.ok) {
      return checkRateLimit(key, maxRequests, windowMs);
    }

    const results = (await pipelineRes.json()) as Array<{ result?: number }>;
    const count = Number(results[0]?.result ?? 1);
    const ttlSeconds = Math.max(1, Number(results[2]?.result ?? windowSeconds));

    if (count > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: ttlSeconds * 1000,
        backend: "REDIS",
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - count),
      resetInMs: ttlSeconds * 1000,
      backend: "REDIS",
    };
  } catch {
    return checkRateLimit(key, maxRequests, windowMs);
  }
}
