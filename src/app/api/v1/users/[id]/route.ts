import { NextRequest, NextResponse } from 'next/server'
import {
  handleApiRequest,
  createApiResponse,
  createApiError
} from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRequest(request, async (auth) => {
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('profiles')
      .select(`
        id, role, name, phone, equipment, crops, trust_score, created_at, updated_at,
        home_location
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createApiError('User not found', 404)
      }
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }

    return NextResponse.json(createApiResponse(data, 'User retrieved successfully'))
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRequest(request, async (auth) => {
    const { id } = await params
    const updateData = await request.json()

    // Check if user exists and get current data
    const { error: fetchError } = await auth.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('User not found', 404)
      }
      return createApiError(fetchError.message, 500)
    }

    // Check permissions (users can only update themselves unless using API key)
    if (!auth.isApiKey && auth.user?.id !== id) {
      return createApiError('Forbidden: Can only update your own profile', 403)
    }

    // Remove sensitive fields that shouldn't be updated via API
    const allowedFields = ['name', 'phone', 'equipment', 'crops', 'home_location']
    const filteredUpdate: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = updateData[field]
      }
    }

    if (Object.keys(filteredUpdate).length === 0) {
      return createApiError('No valid fields to update', 400)
    }

    const { data, error } = await auth.supabase
      .from('profiles')
      .update(filteredUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }

    return NextResponse.json(createApiResponse(data, 'User updated successfully'))
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRequest(request, async (auth) => {
    if (!auth.isApiKey) {
      return createApiError('Admin API key required for user deletion', 403)
    }

    const { id } = await params

    // Check if user exists
    const { error: fetchError } = await auth.supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('User not found', 404)
      }
      return createApiError(fetchError.message, 500)
    }

    // Delete profile (auth user will be cascade deleted)
    const { error: deleteProfileError } = await auth.supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (deleteProfileError) {
      return createApiError(deleteProfileError.message, 500)
    }

    // Delete auth user
    const { error: deleteAuthError } = await auth.supabase.auth.admin.deleteUser(id)

    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError)
      // Profile is already deleted, so continue
    }

    return NextResponse.json(createApiResponse(null, 'User deleted successfully'))
  })
}