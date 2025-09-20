// Simple in-memory rate limiting
// In production, you'd want to use Redis or a similar external store

import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (identifier: string) => string
}

export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  }
): Promise<{
  success: boolean
  allowed: boolean
  remaining: number
  resetTime: number
  limit: number
}> {
  const identifier = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown'
  const key = options.keyGenerator ? options.keyGenerator(identifier) : identifier
  const now = Date.now()

  // Clean up old entries
  for (const [k, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(k)
    }
  }

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // First request in window or window has expired
    const resetTime = now + options.windowMs
    rateLimitStore.set(key, {
      count: 1,
      resetTime
    })

    return {
      success: true,
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime,
      limit: options.maxRequests
    }
  }

  // Increment counter
  entry.count++

  const allowed = entry.count <= options.maxRequests
  const remaining = Math.max(0, options.maxRequests - entry.count)

  return {
    success: allowed,
    allowed,
    remaining,
    resetTime: entry.resetTime,
    limit: options.maxRequests
  }
}

export function getRateLimitHeaders(result: Awaited<ReturnType<typeof checkRateLimit>>) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
  }
}