interface Lead {
  id: string
  businessName: string
  status: string
  outreachStatus: string
  emailFound: boolean
  email: string | null
  createdAt: string
  payment?: { status: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  CONTACTED: 'bg-blue-100 text-blue-800',
  INTERESTED: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  SITE_GENERATED: 'bg-purple-100 text-purple-800',
  SITE_DEPLOYED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-red-100 text-red-800',
}

interface LeadTableProps {
  leads: Lead[]
}

export default function LeadTable({ leads }: LeadTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-600">Business</th>
            <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 font-medium text-gray-600">Email</th>
            <th className="px-4 py-3 font-medium text-gray-600">Outreach</th>
            <th className="px-4 py-3 font-medium text-gray-600">Payment</th>
            <th className="px-4 py-3 font-medium text-gray-600">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{lead.businessName}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {lead.email || (lead.emailFound ? 'Found' : '—')}
              </td>
              <td className="px-4 py-3 text-gray-600">{lead.outreachStatus}</td>
              <td className="px-4 py-3 text-gray-600">{lead.payment?.status || '—'}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(lead.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && (
        <div className="text-center py-8 text-gray-500">No leads found</div>
      )}
    </div>
  )
}
