import { prisma } from './prisma.js'

export async function createAuditLog(
  userId: string | null | undefined,
  userName: string | null | undefined,
  userRole: string | null | undefined,
  action: string,
  module: string,
  recordId?: string | null,
  details?: string | null
) {
  try {
    await (prisma as any).auditLog.create({
      data: {
        userId,
        userName,
        userRole,
        action,
        module,
        recordId,
        details,
      },
    })
  } catch (err) {
    console.error('[Audit Log Error] Failed to write audit log:', err)
  }
}
