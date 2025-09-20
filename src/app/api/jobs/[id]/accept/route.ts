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

    // Validate that user is a carrier
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'carrier') {
      return NextResponse.json({ error: 'Only carriers can accept jobs' }, { status: 403 })
    }

    // Check if job is available
    const { data: job } = await supabase
      .from('jobs')
      .select('status, farmer_id')
      .eq('id', id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'open') {
      return NextResponse.json({ error: 'Job is not available' }, { status: 400 })
    }

    if (job.farmer_id === user.id) {
      return NextResponse.json({ error: 'Cannot accept your own job' }, { status: 400 })
    }

    // Accept the job
    const { data: updatedJob, error } = await supabase
      .from('jobs')
      .update({
        status: 'accepted',
        carrier_id: user.id
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create job accepted event
    await supabase
      .from('events')
      .insert({
        job_id: id,
        user_id: user.id,
        type: 'job_accepted'
      })

    return NextResponse.json(updatedJob)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}