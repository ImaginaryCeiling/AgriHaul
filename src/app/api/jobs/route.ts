import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
        farmer:profiles!farmer_id(id, name, trust_score),
        carrier:profiles!carrier_id(id, name, trust_score)
      `)
      .order('posted_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(jobs)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Get user profile to check if they're a farmer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'farmer') {
      return NextResponse.json({ error: 'Only farmers can post jobs' }, { status: 403 })
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert([{
        farmer_id: user.id,
        ...body
      }])
      .select()
      .single()

    if (error) throw error

    // Log the job posting event
    await supabase
      .from('events')
      .insert([{
        job_id: job.id,
        user_id: user.id,
        type: 'job_posted',
        meta: { job_data: body }
      }])

    return NextResponse.json(job, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}