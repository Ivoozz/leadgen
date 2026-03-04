import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

type LogLevel = 'info' | 'warn' | 'error'
type LogModule = 'scanner' | 'outreach' | 'payment' | 'generator' | 'system'

export async function log(
  level: LogLevel,
  module: LogModule,
  message: string,
  metadata?: Record<string, unknown>
) {
  console.log(`[${level.toUpperCase()}] [${module}] ${message}`, metadata || '')
  try {
    await prisma.systemLog.create({
      data: {
        level,
        module,
        message,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (err) {
    console.error('Failed to write log to database:', err)
  }
}
