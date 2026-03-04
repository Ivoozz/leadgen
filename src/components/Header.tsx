'use client'

import { useSession } from 'next-auth/react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  description?: string
}

export default function Header({ title, description }: HeaderProps) {
  const { data: session } = useSession()
  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .filter((n) => n.length > 0)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'A'
    : (session?.user?.email?.[0] ?? 'A').toUpperCase()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{session?.user?.name ?? 'Admin'}</p>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
