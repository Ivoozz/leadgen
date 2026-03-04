'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
  { href: '/dashboard/outreach', label: 'Outreach', icon: '📧' },
  { href: '/dashboard/payments', label: 'Payments', icon: '💳' },
  { href: '/dashboard/sites', label: 'Sites', icon: '🌐' },
  { href: '/dashboard/config', label: 'Config', icon: '⚙️' },
  { href: '/dashboard/logs', label: 'Logs', icon: '📋' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">LeadGen Platform</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left text-sm text-gray-400 hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
