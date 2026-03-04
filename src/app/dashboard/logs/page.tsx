import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import LogsMonitor from './logs-monitor'

export default async function LogsPage() {
  const logs = await prisma.systemLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  const serialized = logs.map((l) => ({
    id: l.id,
    level: l.level,
    module: l.module,
    message: l.message,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div>
      <Header title="System Logs & AI Monitor" description="Real-time backend monitoring en handmatige scan trigger." />
      <div className="p-6">
        <LogsMonitor initialLogs={serialized} />
      </div>
    </div>
  )
}
