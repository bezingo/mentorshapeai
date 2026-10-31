import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function ShortLinkPage({ params }: PageProps) {
  const { code } = await params

  const supabase = createServiceClient()

  const { data: link } = await supabase
    .from('share_links')
    .select('id, target_url, clicks')
    .eq('short_code', code)
    .single()

  if (!link) {
    notFound()
  }

  await supabase
    .from('share_links')
    .update({ clicks: (link.clicks || 0) + 1 })
    .eq('id', link.id)

  redirect(link.target_url)
}
