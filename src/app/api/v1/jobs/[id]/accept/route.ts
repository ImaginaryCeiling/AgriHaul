import { NextRequest, NextResponse } from 'next/server'
import {
  handleApiRequest,
  createApiResponse,
  createApiError
} from '@/lib/api-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRequest(request, async (auth) => {
    const { id } = await params
    const requestData = await request.json()

    // Determine carrier_id
    let carrier_id: string
    if (auth.isApiKey && requestData.carrier_id) {
      carrier_id = requestData.carrier_id
    } else if (auth.user) {
      // Verify user is a carrier
      const { data: profile } = await auth.supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      if (profile?.role !== 'carrier') {
        return createApiError('Only carriers can accept jobs', 403)
      }
      carrier_id = auth.user.id
    } else {
      return createApiError('carrier_id required when using API key', 400)
    }

    // Check if job exists and is available
    const { data: job, error: fetchError } = await auth.supabase
      .from('jobs')
      .select('status, farmer_id, carrier_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('Job not found', 404)
      }
      return createApiError(fetchError.message, 500)
    }

    if (job.status !== 'open') {
      return createApiError('Job is not available for acceptance', 400)
    }

    if (job.farmer_id === carrier_id) {
      return createApiError('Cannot accept your own job', 400)
    }

    if (job.carrier_id) {
      return createApiError('Job is already accepted by another carrier', 400)
    }

    // Accept the job
    const { data: updatedJob, error: updateError } = await auth.supabase
      .from('jobs')
      .update({
        status: 'accepted',
        carrier_id: carrier_id
      })
      .eq('id', id)
      .select(`
        *,
        farmer:profiles!farmer_id(id, name, trust_score),
        carrier:profiles!carrier_id(id, name, trust_score)
      `)
      .single()

    if (updateError) {
      return createApiError(updateError.message, 500)
    }

    // Create job accepted event
    await auth.supabase
      .from('events')
      .insert({
        job_id: id,
        user_id: carrier_id,
        type: 'job_accepted'
      })

    // Transform response
    const responseData = {
      ...updatedJob,
      payout_dollars: updatedJob.payout_cents / 100,
      pickup_coordinates: updatedJob.pickup_point?.coordinates,
      dropoff_coordinates: updatedJob.dropoff_point?.coordinates
    }

    return NextResponse.json(createApiResponse(
      responseData,
      'Job accepted successfully'
    ))
  })
}