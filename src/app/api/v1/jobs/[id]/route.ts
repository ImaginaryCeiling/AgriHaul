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
      .from('jobs')
      .select(`
        *,
        farmer:profiles!farmer_id(id, name, trust_score, phone),
        carrier:profiles!carrier_id(id, name, trust_score, phone),
        events(id, type, created_at, meta),
        pod_assets(id, url, file_name, created_at),
        ratings(
          id, rater_id, ratee_id, on_time, communication, accuracy,
          condition, compliance, resolution, comment, created_at,
          rater:profiles!rater_id(id, name)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createApiError('Job not found', 404)
      }
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }

    // Transform data for API response
    const responseData = {
      ...data,
      payout_dollars: data.payout_cents / 100,
      pickup_coordinates: data.pickup_point?.coordinates,
      dropoff_coordinates: data.dropoff_point?.coordinates
    }

    return NextResponse.json(createApiResponse(responseData, 'Job retrieved successfully'))
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRequest(request, async (auth) => {
    const { id } = await params
    const updateData = await request.json()

    // Get current job
    const { data: existingJob, error: fetchError } = await auth.supabase
      .from('jobs')
      .select('farmer_id, carrier_id, status')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('Job not found', 404)
      }
      return createApiError(fetchError.message, 500)
    }

    // Check permissions
    const isParticipant = auth.user && (
      existingJob.farmer_id === auth.user.id ||
      existingJob.carrier_id === auth.user.id
    )

    if (!auth.isApiKey && !isParticipant) {
      return createApiError('Forbidden: Not authorized for this job', 403)
    }

    // Define allowed fields based on context
    const allowedFields = ['notes', 'pickup_address', 'dropoff_address']
    if (auth.isApiKey) {
      allowedFields.push('status', 'carrier_id', 'crop', 'load_size', 'payout_dollars', 'is_perishable')
    }

    const filteredUpdate: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'payout_dollars') {
          filteredUpdate.payout_cents = Math.round(parseFloat(updateData[field]) * 100)
        } else {
          filteredUpdate[field] = updateData[field]
        }
      }
    }

    if (Object.keys(filteredUpdate).length === 0) {
      return createApiError('No valid fields to update', 400)
    }

    // Validate status transitions
    if (filteredUpdate.status) {
      const validTransitions: Record<string, string[]> = {
        open: ['accepted', 'cancelled'],
        accepted: ['in_transit', 'cancelled'],
        in_transit: ['delivered', 'cancelled'],
        delivered: ['paid'],
      }

      const currentStatus = existingJob.status as keyof typeof validTransitions
      if (!validTransitions[currentStatus]?.includes(filteredUpdate.status as string)) {
        return createApiError(
          `Cannot transition from ${currentStatus} to ${filteredUpdate.status}`,
          400
        )
      }
    }

    const { data, error } = await auth.supabase
      .from('jobs')
      .update(filteredUpdate)
      .eq('id', id)
      .select(`
        *,
        farmer:profiles!farmer_id(id, name, trust_score),
        carrier:profiles!carrier_id(id, name, trust_score)
      `)
      .single()

    if (error) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }

    // Create status change event if status was updated
    if (filteredUpdate.status) {
      const eventTypeMap: Record<string, string> = {
        accepted: 'job_accepted',
        in_transit: 'job_started',
        delivered: 'job_delivered',
        paid: 'job_paid',
        cancelled: 'job_cancelled'
      }

      await auth.supabase
        .from('events')
        .insert({
          job_id: id,
          user_id: auth.user?.id || null,
          type: eventTypeMap[filteredUpdate.status as string] || 'job_updated'
        })
    }

    // Transform response
    const responseData = {
      ...data,
      payout_dollars: data.payout_cents / 100,
      pickup_coordinates: data.pickup_point?.coordinates,
      dropoff_coordinates: data.dropoff_point?.coordinates
    }

    return NextResponse.json(createApiResponse(responseData, 'Job updated successfully'))
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRequest(request, async (auth) => {
    const { id } = await params

    // Get current job
    const { data: existingJob, error: fetchError } = await auth.supabase
      .from('jobs')
      .select('farmer_id, status')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('Job not found', 404)
      }
      return createApiError(fetchError.message, 500)
    }

    // Check permissions (only job owner or API key can delete)
    if (!auth.isApiKey && auth.user?.id !== existingJob.farmer_id) {
      return createApiError('Forbidden: Only job owner can delete', 403)
    }

    // Only allow deletion of open or cancelled jobs
    if (!['open', 'cancelled'].includes(existingJob.status)) {
      return createApiError('Can only delete open or cancelled jobs', 400)
    }

    const { error } = await auth.supabase
      .from('jobs')
      .delete()
      .eq('id', id)

    if (error) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }

    return NextResponse.json(createApiResponse(null, 'Job deleted successfully'))
  })
}