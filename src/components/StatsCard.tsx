interface StatsCardProps {
  title: string
  value: number | string
  icon: string
  color: string
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
      <div className={`text-3xl p-3 rounded-full ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
