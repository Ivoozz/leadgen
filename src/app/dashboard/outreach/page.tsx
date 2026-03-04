import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'

export default async function OutreachPage() {
  const logs = await prisma.outreachLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: 100,
    include: { lead: { select: { businessName: true } } },
  })

  return (
    <div>
      <Header title="Outreach" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Email Outreach Logs ({logs.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Business</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Email To</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Subject</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{log.lead.businessName}</td>
                    <td className="px-4 py-3 text-gray-600">{log.emailTo}</td>
                    <td className="px-4 py-3 text-gray-600">{log.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-500">No outreach logs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
