interface SystemLog {
  id: string
  level: string
  module: string
  message: string
  createdAt: string
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

interface LogViewerProps {
  logs: SystemLog[]
}

export default function LogViewer({ logs }: LogViewerProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
      {logs.length === 0 ? (
        <p className="text-gray-500">No logs available</p>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="mb-1">
            <span className="text-gray-500">
              {new Date(log.createdAt).toLocaleTimeString()}
            </span>{' '}
            <span className={`font-bold ${LEVEL_COLORS[log.level] || 'text-white'}`}>
              [{log.level.toUpperCase()}]
            </span>{' '}
            <span className="text-purple-400">[{log.module}]</span>{' '}
            <span className="text-gray-200">{log.message}</span>
          </div>
        ))
      )}
    </div>
  )
}
