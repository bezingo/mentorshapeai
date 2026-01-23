import { redirect } from 'next/navigation'

// Redirect to the new profile edit page
export default function ProfileSettingsPage() {
  redirect('/dashboard/profile')
}
