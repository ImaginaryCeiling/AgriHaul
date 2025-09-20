import { NextRequest, NextResponse } from 'next/server'
import {
  handleApiRequest,
  createApiResponse
} from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  // Example of rate limiting - 100 requests per minute
  return handleApiRequest(
    request,
    async () => {
      const apiInfo = {
        name: "AgriHaul API",
        version: "1.0.0",
        description: "REST API for the AgriHaul agricultural transportation marketplace",
        documentation: "/api/docs",
        openapi_spec: "/api/v1/docs",
        endpoints: {
          users: "/api/v1/users",
          jobs: "/api/v1/jobs",
          ratings: "/api/v1/ratings",
          stats: "/api/v1/stats"
        },
        authentication: {
          api_key: "x-api-key header (admin access)",
          bearer_token: "Authorization: Bearer <token> (user access)"
        },
        rate_limits: {
          default: "100 requests per minute",
          authenticated: "1000 requests per minute"
        }
      }

      return NextResponse.json(createApiResponse(
        apiInfo,
        'AgriHaul API v1.0.0'
      ))
    },
    {
      skipAuth: true,
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100
      }
    }
  )
}