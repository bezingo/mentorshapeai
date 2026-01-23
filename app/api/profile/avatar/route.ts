import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

// Update avatar URL schema
const AvatarUpdateSchema = z.object({
  avatar_url: z.string().url(),
})

/**
 * POST /api/profile/avatar
 * Upload avatar file to Supabase Storage (server-side to bypass RLS)
 */
export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No file provided',
          },
        },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File size exceeds 5MB limit',
          },
        },
        { status: 400 }
      )
    }

    // Validate content type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Only JPG and PNG formats are allowed',
          },
        },
        { status: 400 }
      )
    }

    // Determine file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg'
    const filePath = `${profile.id}/avatar.${extension}`

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage using service client (bypasses RLS)
    // Authentication is already verified via getCurrentProfile() above
    const supabase = createServiceClient()
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return NextResponse.json(
        { error: { code: 'UPLOAD_FAILED', message: uploadError.message } },
        { status: 500 }
      )
    }

    // Generate public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${filePath}`

    // Update profile with new avatar URL
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating avatar URL:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        path: filePath,
        avatar_url: avatarUrl,
        profile: updatedProfile,
      },
    })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload avatar' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/profile/avatar
 * Update profile avatar_url after successful upload
 */
export async function PUT(request: Request) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request
    let validatedData
    try {
      validatedData = AvatarUpdateSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: error.errors[0]?.message || 'Validation failed',
            },
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Update profile avatar_url using service client
    // Authentication is already verified via getCurrentProfile() above
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: validatedData.avatar_url })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating avatar URL:', error)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating avatar URL:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update avatar URL' } },
      { status: 500 }
    )
  }
}

