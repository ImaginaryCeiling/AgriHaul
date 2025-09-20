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
      .from('jobs')
      .select(`
        *,
        farmer:profiles!farmer_id(id, name, trust_score, phone),
        carrier:profiles!carrier_id(id, name, trust_score, phone)
      `, { count: 'exact' })

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }
    if (filters.crop) {
      query = query.ilike('crop', `%${filters.crop}%`)
    }
    if (filters.farmer_id) {
      query = query.eq('farmer_id', filters.farmer_id)
    }
    if (filters.carrier_id) {
      query = query.eq('carrier_id', filters.carrier_id)
    }
    if (filters.is_perishable !== undefined) {
      query = query.eq('is_perishable', filters.is_perishable === 'true')
    }
    if (filters.payout && typeof filters.payout === 'object' && 'min' in filters.payout && filters.payout.min) {
      query = query.gte('payout_cents', parseFloat(filters.payout.min as string) * 100)
    }
    if (filters.payout && typeof filters.payout === 'object' && 'max' in filters.payout && filters.payout.max) {
      query = query.lte('payout_cents', parseFloat(filters.payout.max as string) * 100)
    }
    if (filters.load_size && typeof filters.load_size === 'object' && 'min' in filters.load_size && filters.load_size.min) {
      query = query.gte('load_size', parseFloat(filters.load_size.min as string))
    }
    if (filters.load_size && typeof filters.load_size === 'object' && 'max' in filters.load_size && filters.load_size.max) {
      query = query.lte('load_size', parseFloat(filters.load_size.max as string))
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Apply pagination
    query = addPaginationToQuery(query, page, limit, offset)

    const { data, error, count } = await query

    if (error) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }

    // Transform data for API response
    const transformedData = data?.map(job => ({
      ...job,
      payout_dollars: job.payout_cents / 100,
      pickup_coordinates: job.pickup_point?.coordinates,
      dropoff_coordinates: job.dropoff_point?.coordinates
    }))

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json(createApiResponse(
      transformedData,
      `Retrieved ${data?.length || 0} jobs`,
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
    const jobData = await request.json()

    // Validate required fields
    const required = ['crop', 'load_size', 'payout_dollars', 'pickup_address', 'dropoff_address']
    for (const field of required) {
      if (!jobData[field]) {
        return createApiError(`Missing required field: ${field}`, 400)
      }
    }

    // Determine farmer_id
    let farmer_id: string
    if (auth.isApiKey && jobData.farmer_id) {
      farmer_id = jobData.farmer_id
    } else if (auth.user) {
      // Verify user is a farmer
      const { data: profile } = await auth.supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      if (profile?.role !== 'farmer') {
        return createApiError('Only farmers can create jobs', 403)
      }
      farmer_id = auth.user.id
    } else {
      return createApiError('farmer_id required when using API key', 400)
    }

    // Convert coordinates if provided, otherwise use default
    let pickup_point = `POINT(-98.5795 39.8283)` // Default center USA
    let dropoff_point = `POINT(-98.5795 39.8283)`

    if (jobData.pickup_coordinates) {
      const [lng, lat] = jobData.pickup_coordinates
      pickup_point = `POINT(${lng} ${lat})`
    }
    if (jobData.dropoff_coordinates) {
      const [lng, lat] = jobData.dropoff_coordinates
      dropoff_point = `POINT(${lng} ${lat})`
    }

    const insertData = {
      farmer_id,
      crop: jobData.crop,
      load_size: parseFloat(jobData.load_size),
      payout_cents: Math.round(parseFloat(jobData.payout_dollars) * 100),
      pickup_address: jobData.pickup_address,
      dropoff_address: jobData.dropoff_address,
      pickup_point,
      dropoff_point,
      equipment_needed: jobData.equipment_needed || [],
      is_perishable: jobData.is_perishable || false,
      notes: jobData.notes || null
    }

    const { data, error } = await auth.supabase
      .from('jobs')
      .insert(insertData)
      .select(`
        *,
        farmer:profiles!farmer_id(id, name, trust_score)
      `)
      .single()

    if (error) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 400)
    }

    // Create job posted event
    await auth.supabase
      .from('events')
      .insert({
        job_id: data.id,
        user_id: farmer_id,
        type: 'job_posted'
      })

    // Transform response
    const responseData = {
      ...data,
      payout_dollars: data.payout_cents / 100,
      pickup_coordinates: data.pickup_point?.coordinates,
      dropoff_coordinates: data.dropoff_point?.coordinates
    }

    return NextResponse.json(createApiResponse(
      responseData,
      'Job created successfully'
    ), { status: 201 })
  })
}