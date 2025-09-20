import { NextRequest, NextResponse } from 'next/server'
import {
  handleApiRequest,
  createApiResponse,
  createApiError,
  validatePagination,
  addPaginationToQuery,
  parseFilters,
  parseSorting
} from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (auth) => {
    const { page, limit, offset } = validatePagination(request)
    const filters = parseFilters(request)
    const { sort, order } = parseSorting(request)

    let query = auth.supabase
      .from('ratings')
      .select(`
        *,
        job:jobs(id, crop, status),
        rater:profiles!rater_id(id, name, role),
        ratee:profiles!ratee_id(id, name, role, trust_score)
      `, { count: 'exact' })

    // Apply filters
    if (filters.job_id) {
      query = query.eq('job_id', filters.job_id)
    }
    if (filters.rater_id) {
      query = query.eq('rater_id', filters.rater_id)
    }
    if (filters.ratee_id) {
      query = query.eq('ratee_id', filters.ratee_id)
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Apply pagination
    query = addPaginationToQuery(query, page, limit, offset)

    const { data, error, count } = await query

    if (error) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json(createApiResponse(
      data,
      `Retrieved ${data?.length || 0} ratings`,
      {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    ))
  })
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async (auth) => {
    const ratingData = await request.json()

    // Validate required fields
    const required = ['job_id', 'ratee_id']
    for (const field of required) {
      if (!ratingData[field]) {
        return createApiError(`Missing required field: ${field}`, 400)
      }
    }

    // Determine rater_id
    let rater_id: string
    if (auth.isApiKey && ratingData.rater_id) {
      rater_id = ratingData.rater_id
    } else if (auth.user) {
      rater_id = auth.user.id
    } else {
      return createApiError('rater_id required when using API key', 400)
    }

    // Validate that the job exists and user is a participant
    const { data: job, error: jobError } = await auth.supabase
      .from('jobs')
      .select('farmer_id, carrier_id, status')
      .eq('id', ratingData.job_id)
      .single()

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return createApiError('Job not found', 404)
      }
      return createApiError(jobError.message, 500)
    }

    if (!['delivered', 'paid'].includes(job.status)) {
      return createApiError('Can only rate completed jobs', 400)
    }

    const isParticipant = job.farmer_id === rater_id || job.carrier_id === rater_id
    if (!auth.isApiKey && !isParticipant) {
      return createApiError('Not authorized for this job', 403)
    }

    // Validate ratee_id is the other participant
    const validRatee = (job.farmer_id === rater_id && job.carrier_id === ratingData.ratee_id) ||
                      (job.carrier_id === rater_id && job.farmer_id === ratingData.ratee_id)

    if (!validRatee) {
      return createApiError('Invalid ratee for this job', 400)
    }

    // Check if rating already exists
    const { data: existingRating } = await auth.supabase
      .from('ratings')
      .select('id')
      .eq('job_id', ratingData.job_id)
      .eq('rater_id', rater_id)
      .single()

    if (existingRating) {
      return createApiError('Rating already exists for this job', 400)
    }

    // Validate score ranges
    const scoreFields = ['on_time', 'communication', 'accuracy', 'condition', 'compliance', 'resolution']
    const scores: Record<string, number> = {}

    for (const field of scoreFields) {
      if (ratingData[field] !== undefined) {
        const score = parseInt(ratingData[field])
        if (score < 0 || score > 10) {
          return createApiError(`${field} must be between 0 and 10`, 400)
        }
        scores[field] = score
      }
    }

    // Insert rating
    const { data, error } = await auth.supabase
      .from('ratings')
      .insert({
        job_id: ratingData.job_id,
        rater_id,
        ratee_id: ratingData.ratee_id,
        comment: ratingData.comment || null,
        ...scores
      })
      .select(`
        *,
        job:jobs(id, crop, status),
        rater:profiles!rater_id(id, name, role),
        ratee:profiles!ratee_id(id, name, role, trust_score)
      `)
      .single()

    if (error) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 400)
    }

    return NextResponse.json(createApiResponse(
      data,
      'Rating submitted successfully'
    ), { status: 201 })
  })
}