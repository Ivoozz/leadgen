import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import PaymentStatus from '@/components/PaymentStatus'

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { lead: { select: { businessName: true } } },
  })

  const serialized = payments.map((p) => ({
    ...p,
    amount: p.amount.toString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    paidAt: p.paidAt?.toISOString() || null,
  }))

  return (
    <div>
      <Header title="Payments" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">All Payments ({payments.length})</h3>
          </div>
          <PaymentStatus payments={serialized} />
        </div>
      </div>
    </div>
  )
}
