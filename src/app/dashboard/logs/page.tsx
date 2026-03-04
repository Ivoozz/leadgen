import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import LogViewer from '@/components/LogViewer'

export default async function LogsPage() {
  const logs = await prisma.systemLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const serialized = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    metadata: log.metadata as Record<string, unknown> | null,
  }))

  return (
    <div>
      <Header title="System Logs" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">System Logs</h3>
          </div>
          <div className="p-4">
            <LogViewer logs={serialized} />
          </div>
        </div>
      </div>
    </div>
  )
}
