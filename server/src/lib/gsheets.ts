import { reconcileAllSheets, syncRecordCreate, syncRecordUpdate, syncRecordDelete } from './google-sheets-sync.js'

export interface IncrementalSyncResult {
  status: 'success' | 'up_to_date' | 'already_running' | 'failed'
  message: string
  added: number
  updated: number
  deleted: number
  unchanged: number
  totalRecords: number
  completedAt: Date
  error?: string
}

export async function syncGoogleSheetsIncremental(triggerType: 'manual' | 'cron', triggeredBy: string = 'System'): Promise<IncrementalSyncResult> {
  const result = await reconcileAllSheets()
  return {
    status: result.status,
    message: result.message,
    added: result.added,
    updated: result.updated,
    deleted: result.deleted,
    unchanged: result.unchanged,
    totalRecords: result.totalRecords,
    completedAt: result.completedAt,
    error: result.error
  }
}

export function triggerRealtimeBackup(reason: string = 'Realtime change') {
  setTimeout(() => {
    reconcileAllSheets().catch((err) => {
      console.error('[Realtime Google Sheets Sync Error]:', err.message)
    })
  }, 1000)
}

export { reconcileAllSheets, syncRecordCreate, syncRecordUpdate, syncRecordDelete }
