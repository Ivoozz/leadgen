interface Payment {
  id: string
  leadId: string
  amount: string
  currency: string
  status: string
  paidAt: string | null
  createdAt: string
  lead?: { businessName: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
}

interface PaymentStatusProps {
  payments: Payment[]
}

export default function PaymentStatus({ payments }: PaymentStatusProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-600">Business</th>
            <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
            <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 font-medium text-gray-600">Paid At</th>
            <th className="px-4 py-3 font-medium text-gray-600">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {payment.lead?.businessName || payment.leadId}
              </td>
              <td className="px-4 py-3 text-gray-900">
                {payment.currency} {payment.amount}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-800'}`}>
                  {payment.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(payment.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {payments.length === 0 && (
        <div className="text-center py-8 text-gray-500">No payments found</div>
      )}
    </div>
  )
}
