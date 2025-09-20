import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function createApiResponse<T>(
  data?: T,
  message?: string,
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    pagination
  }
}

export function createApiError(
  error: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error
    },
    { status }
  )
}

interface AuthContext {
  user: {
    id: string
    email?: string
  }
  supabase: Awaited<ReturnType<typeof createClient>>
  isApiKey?: boolean
}

interface RequestHandler {
  (auth: AuthContext): Promise<NextResponse>
}

interface HandlerOptions {
  skipAuth?: boolean
  skipRateLimit?: boolean
  requireApiKey?: boolean
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
}

export async function handleApiRequest(
  request: NextRequest,
  handler: RequestHandler,
  options: HandlerOptions = {}
): Promise<NextResponse> {
  try {
    // Check rate limiting first
    if (!options.skipRateLimit) {
      const rateLimitResult = await checkRateLimit(request, options.rateLimit)
      
      if (!rateLimitResult.success) {
        const response = createApiError('Rate limit exceeded', 429)
        
        // Add rate limit headers
        const headers = getRateLimitHeaders(rateLimitResult)
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value.toString())
        })
        
        return response
      }
    }

    // Skip auth if requested
    if (options.skipAuth) {
      const supabase = await createClient()
      const mockAuth = {
        user: { id: '', email: '' },
        supabase,
        isApiKey: false
      }
      return await handler(mockAuth)
    }

    // Check for API key authentication
    const apiKey = request.headers.get('x-api-key')
    
    if (options.requireApiKey && !apiKey) {
      return createApiError('API key required', 401)
    }

    if (apiKey) {
      // Validate API key (Supabase service role key)
      if (apiKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createApiError('Invalid API key', 401)
      }
      
      const supabase = await createClient()
      const mockAuth = {
        user: { id: 'admin', email: 'admin@system' },
        supabase,
        isApiKey: true
      }
      return await handler(mockAuth)
    }

    // Check for Bearer token authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiError('Authorization required', 401)
    }

    const token = authHeader.substring(7)
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return createApiError('Invalid token', 401)
    }

    return await handler({
      user,
      supabase,
      isApiKey: false
    })

  } catch {
    return createApiError('Internal server error', 500)
  }
}

export function validatePagination(request: NextRequest) {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

export function addPaginationToQuery<T>(
  query: T,
  _page: number,
  _limit: number,
  _offset: number
): T {
  // This is a passthrough function to maintain the query builder pattern
  return query
}

export function parseFilters(request: NextRequest): Record<string, unknown> {
  const url = new URL(request.url)
  const filters: Record<string, unknown> = {}

  // Parse trust_score range filters
  const trustScoreGte = url.searchParams.get('trust_score.gte')
  const trustScoreLte = url.searchParams.get('trust_score.lte')
  
  if (trustScoreGte || trustScoreLte) {
    filters.trust_score = {}
    if (trustScoreGte) filters.trust_score = { ...filters.trust_score as object, gte: trustScoreGte }
    if (trustScoreLte) filters.trust_score = { ...filters.trust_score as object, lte: trustScoreLte }
  }

  // Parse other simple filters
  const simpleFilters = ['role', 'status', 'crop', 'farmer_id', 'carrier_id', 'job_id', 'rater_id', 'ratee_id']
  simpleFilters.forEach(filter => {
    const value = url.searchParams.get(filter)
    if (value) {
      filters[filter] = value
    }
  })

  // Parse boolean filters
  const booleanFilters = ['is_perishable']
  booleanFilters.forEach(filter => {
    const value = url.searchParams.get(filter)
    if (value !== null) {
      filters[filter] = value === 'true'
    }
  })

  // Parse numeric range filters
  const numericRangeFilters = ['payout', 'load_size']
  numericRangeFilters.forEach(filter => {
    const minValue = url.searchParams.get(`${filter}_min`)
    const maxValue = url.searchParams.get(`${filter}_max`)
    
    if (minValue || maxValue) {
      filters[filter] = {}
      if (minValue) filters[filter] = { ...filters[filter] as object, min: parseFloat(minValue) }
      if (maxValue) filters[filter] = { ...filters[filter] as object, max: parseFloat(maxValue) }
    }
  })

  return filters
}

export function parseSorting(request: NextRequest) {
  const url = new URL(request.url)
  const sort = url.searchParams.get('sort') || 'created_at'
  const order = url.searchParams.get('order') === 'desc' ? 'desc' : 'asc'

  return { sort, order }
}