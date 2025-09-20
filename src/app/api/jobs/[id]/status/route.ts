import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status } = await request.json()

    // Validate status transitions
    const validTransitions = {
      accepted: ['in_transit'],
      in_transit: ['delivered'],
      delivered: ['paid'],
    }

    // Get current job
    const { data: job } = await supabase
      .from('jobs')
      .select('status, farmer_id, carrier_id')
      .eq('id', id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check permissions
    const isParticipant = job.farmer_id === user.id || job.carrier_id === user.id
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not authorized for this job' }, { status: 403 })
    }

    // Validate status transition
    const currentStatus = job.status as keyof typeof validTransitions
    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from ${job.status} to ${status}`
      }, { status: 400 })
    }

    // Check role-specific permissions
    if (status === 'in_transit' && job.carrier_id !== user.id) {
      return NextResponse.json({ error: 'Only carrier can start transit' }, { status: 403 })
    }

    if (status === 'delivered' && job.carrier_id !== user.id) {
      return NextResponse.json({ error: 'Only carrier can mark as delivered' }, { status: 403 })
    }

    if (status === 'paid' && job.farmer_id !== user.id) {
      return NextResponse.json({ error: 'Only farmer can mark as paid' }, { status: 403 })
    }

    // Update job status
    const { data: updatedJob, error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create status change event
    const eventTypeMap: Record<string, string> = {
      in_transit: 'job_started',
      delivered: 'job_delivered',
      paid: 'job_paid'
    }

    await supabase
      .from('events')
      .insert({
        job_id: id,
        user_id: user.id,
        type: eventTypeMap[status] || 'job_updated'
      })

    return NextResponse.json(updatedJob)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}