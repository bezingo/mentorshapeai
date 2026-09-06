'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Counselor layout - role-gates to school-admin only
 */
export default function CounselorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/counselor/dashboard')
        if (response.ok) {
          setIsAuthorized(true)
        } else if (response.status === 403) {
          router.push('/dashboard')
        } else {
          router.push('/sign-in')
        }
      } catch {
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
