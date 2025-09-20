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
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Check if user is the carrier for this job
    const { data: job } = await supabase
      .from('jobs')
      .select('carrier_id, status')
      .eq('id', id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.carrier_id !== user.id) {
      return NextResponse.json({ error: 'Only the assigned carrier can upload POD' }, { status: 403 })
    }

    if (job.status !== 'in_transit' && job.status !== 'delivered') {
      return NextResponse.json({ error: 'Can only upload POD for jobs in transit or delivered' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileName = `pod_${id}_${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('pod-assets')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pod-assets')
      .getPublicUrl(fileName)

    // Save POD asset record
    const { data: podAsset, error: podError } = await supabase
      .from('pod_assets')
      .insert({
        job_id: id,
        url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single()

    if (podError) throw podError

    return NextResponse.json(podAsset, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}