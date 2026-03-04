'use client'

import { useSession } from 'next-auth/react'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      {session?.user && (
        <span className="text-sm text-gray-500">{session.user.email}</span>
      )}
    </header>
  )
}
