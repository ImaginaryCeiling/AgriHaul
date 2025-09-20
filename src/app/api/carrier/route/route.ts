import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const routeData = await request.json()
    const { current_location, route_polyline, remaining_capacity } = routeData

    // Validate that user is a carrier
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'carrier') {
      return NextResponse.json({ error: 'Only carriers can declare routes' }, { status: 403 })
    }

    // Store route declaration as an event
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        type: 'route_declared',
        meta: {
          current_location,
          route_polyline,
          remaining_capacity,
          declared_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(event, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent route declarations from carriers
    const { data: routes, error } = await supabase
      .from('events')
      .select(`
        *,
        profile:profiles!user_id(id, name, trust_score)
      `)
      .eq('type', 'route_declared')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(routes)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}