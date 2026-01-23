import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new NextResponse('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type
  const supabase = createServiceClient() // Use service role to bypass RLS

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data

    // Get primary email
    const primaryEmail = email_addresses.find(
      (email: any) => email.id === evt.data.primary_email_address_id
    )?.email_address

    if (!primaryEmail) {
      return new NextResponse('No email found', { status: 400 })
    }

    try {
      // Create user in Supabase
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: id,
          email: primaryEmail,
        })
        .select()
        .single()

      if (userError) {
        // Check if user already exists (idempotency)
        if (userError.code === '23505') {
          // Unique constraint violation - user already exists
          console.log('User already exists, skipping creation')
          return new NextResponse('User already exists', { status: 200 })
        }
        console.error('Error creating user:', userError)
        return new NextResponse(
          JSON.stringify({ error: userError.message }),
          { status: 500 }
        )
      }

      // Create profile for user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: first_name && last_name 
            ? `${first_name} ${last_name}`.trim()
            : primaryEmail.split('@')[0],
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Don't fail the webhook if profile creation fails
        // We can retry or handle this separately
      }

      return new NextResponse(
        JSON.stringify({ 
          status: 'processed',
          user_id: user.id 
        }),
        { status: 200 }
      )
    } catch (error) {
      console.error('Error processing user.created:', error)
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      )
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses } = evt.data

    const primaryEmail = email_addresses.find(
      (email: any) => email.id === evt.data.primary_email_address_id
    )?.email_address

    if (!primaryEmail) {
      return new NextResponse('No email found', { status: 400 })
    }

    // Update user email if changed
    const { error } = await supabase
      .from('users')
      .update({ email: primaryEmail })
      .eq('clerk_user_id', id)

    if (error) {
      console.error('Error updating user:', error)
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      )
    }

    return new NextResponse(
      JSON.stringify({ status: 'processed' }),
      { status: 200 }
    )
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    // Delete user (cascade will handle profile deletion)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('clerk_user_id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      )
    }

    return new NextResponse(
      JSON.stringify({ status: 'processed' }),
      { status: 200 }
    )
  }

  return new NextResponse('', { status: 200 })
}

