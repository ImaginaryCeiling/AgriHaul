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
      .from('profiles')
      .select('id, role, name, phone, equipment, crops, trust_score, created_at, updated_at', { count: 'exact' })

    // Apply filters
    if (filters.role) {
      query = query.eq('role', filters.role)
    }
    if (filters.trust_score && typeof filters.trust_score === 'object' && 'gte' in filters.trust_score && filters.trust_score.gte) {
      query = query.gte('trust_score', parseInt(filters.trust_score.gte as string))
    }
    if (filters.trust_score && typeof filters.trust_score === 'object' && 'lte' in filters.trust_score && filters.trust_score.lte) {
      query = query.lte('trust_score', parseInt(filters.trust_score.lte as string))
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
      `Retrieved ${data?.length || 0} users`,
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
    if (!auth.isApiKey) {
      return createApiError('Admin API key required for user creation', 403)
    }

    const userData = await request.json()

    // Validate required fields
    const required = ['email', 'password', 'role', 'name']
    for (const field of required) {
      if (!userData[field]) {
        return createApiError(`Missing required field: ${field}`, 400)
      }
    }

    if (!['farmer', 'carrier'].includes(userData.role)) {
      return createApiError('Role must be either farmer or carrier', 400)
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await auth.supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      })

      if (authError) {
        return createApiError(authError.message, 400)
      }

      // Create profile
      const { data: profileData, error: profileError } = await auth.supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: userData.role,
          name: userData.name,
          phone: userData.phone || null,
          equipment: userData.equipment || [],
          crops: userData.crops || [],
          home_location: userData.home_location || null,
          trust_score: 50
        })
        .select()
        .single()

      if (profileError) {
        // Cleanup auth user if profile creation fails
        await auth.supabase.auth.admin.deleteUser(authData.user.id)
        return createApiError(profileError.message, 400)
      }

      return NextResponse.json(createApiResponse(
        {
          id: profileData.id,
          email: authData.user.email,
          ...profileData
        },
        'User created successfully'
      ), { status: 201 })

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create user'
      return createApiError(message, 500)
    }
  })
}