import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ratingData = await request.json()
    const { job_id, ratee_id, ...scores } = ratingData

    // Validate that the job exists and user is a participant
    const { data: job } = await supabase
      .from('jobs')
      .select('farmer_id, carrier_id, status')
      .eq('id', job_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'delivered' && job.status !== 'paid') {
      return NextResponse.json({ error: 'Can only rate completed jobs' }, { status: 400 })
    }

    const isParticipant = job.farmer_id === user.id || job.carrier_id === user.id
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not authorized for this job' }, { status: 403 })
    }

    // Validate ratee_id is the other participant
    const validRatee = (job.farmer_id === user.id && job.carrier_id === ratee_id) ||
                      (job.carrier_id === user.id && job.farmer_id === ratee_id)

    if (!validRatee) {
      return NextResponse.json({ error: 'Invalid ratee' }, { status: 400 })
    }

    // Check if rating already exists
    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('job_id', job_id)
      .eq('rater_id', user.id)
      .single()

    if (existingRating) {
      return NextResponse.json({ error: 'Rating already exists for this job' }, { status: 400 })
    }

    // Validate score ranges
    const scoreFields = ['on_time', 'communication', 'accuracy', 'condition', 'compliance', 'resolution']
    for (const field of scoreFields) {
      if (scores[field] !== undefined && (scores[field] < 0 || scores[field] > 10)) {
        return NextResponse.json({ error: `${field} must be between 0 and 10` }, { status: 400 })
      }
    }

    // Insert rating
    const { data: rating, error } = await supabase
      .from('ratings')
      .insert({
        job_id,
        rater_id: user.id,
        ratee_id,
        ...scores
      })
      .select()
      .single()

    if (error) throw error

    // Note: Trust score update is handled by the database trigger

    return NextResponse.json(rating, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}