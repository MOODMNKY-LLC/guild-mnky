/**
 * API Route: Create Missing Sherpa Record
 * 
 * Admin-only endpoint to create a Sherpa record for an approved application
 * Useful for fixing missing records due to RLS errors
 */

import { createClient } from '@/lib/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or officer
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'officer')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or Officer access required' },
        { status: 403 }
      )
    }

    const { applicationId } = await request.json()

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      )
    }

    // Use admin client to fetch application
    const adminSupabase = getAdminClient()

    // Fetch application
    const { data: application, error: appError } = await adminSupabase
      .from('sherpa_applications')
      .select('id, profile_id, community_id, specialties, availability, status')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const app = application as { id: string; profile_id: string; community_id: string; specialties: string; availability: string; status: string }
    if (app.status !== 'approved') {
      return NextResponse.json(
        { error: 'Application is not approved' },
        { status: 400 }
      )
    }

    // Check if Sherpa record already exists
    const { data: existing } = await adminSupabase
      .from('sherpas')
      .select('id')
      .eq('profile_id', app.profile_id)
      .eq('community_id', app.community_id)
      .single()

    if (existing) {
      const existingRecord = existing as { id: string }
      return NextResponse.json({
        success: true,
        message: 'Sherpa record already exists',
        sherpaId: existingRecord.id,
        alreadyExists: true,
      })
    }

    // Create Sherpa record
    const { data: newSherpa, error: createError } = await adminSupabase
      .from('sherpas')
      .insert({
        profile_id: app.profile_id,
        community_id: app.community_id,
        application_id: app.id,
        specialties: app.specialties,
        availability: app.availability,
        is_active: true,
      } as any)
      .select('id')
      .single()

    if (createError) {
      return NextResponse.json(
        { error: `Failed to create Sherpa record: ${createError.message}` },
        { status: 500 }
      )
    }

    const newRecord = newSherpa as { id: string }
    return NextResponse.json({
      success: true,
      message: 'Sherpa record created successfully',
      sherpaId: newRecord.id,
    })

  } catch (error: any) {
    console.error('Error creating Sherpa record:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
