import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'

const SITE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  GENERATING: 'bg-blue-100 text-blue-800',
  GENERATED: 'bg-yellow-100 text-yellow-800',
  DEPLOYING: 'bg-orange-100 text-orange-800',
  DEPLOYED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

export default async function SitesPage() {
  const sites = await prisma.generatedSite.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { lead: { select: { businessName: true } } },
  })

  return (
    <div>
      <Header title="Generated Sites" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">All Sites ({sites.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Business</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">URL</th>
                  <th className="px-4 py-3 font-medium text-gray-600">AI Model</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Deployed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{site.lead.businessName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${SITE_STATUS_COLORS[site.status] || 'bg-gray-100 text-gray-800'}`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {site.siteUrl ? (
                        <a href={site.siteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {site.siteUrl}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{site.aiModel || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {site.deployedAt ? new Date(site.deployedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sites.length === 0 && (
              <div className="text-center py-8 text-gray-500">No sites generated yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
