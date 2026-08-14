import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'

interface RealtimeEnvelope {
  event: string
  id: number
  occurred_at: string

  [key: string]: string | number
}

export default class RealtimeService {
  notification(tenantId: number, userId: number, payload: RealtimeEnvelope) {
    return this.broadcast(`tenants/${tenantId}/users/${userId}/notifications`, payload)
  }

  message(tenantId: number, userId: number, payload: RealtimeEnvelope) {
    return this.broadcast(`tenants/${tenantId}/users/${userId}/messages`, payload)
  }

  activity(tenantId: number, payload: RealtimeEnvelope) {
    return this.broadcast(`tenants/${tenantId}/activity`, payload)
  }

  private async broadcast(channel: string, payload: RealtimeEnvelope): Promise<boolean> {
    try {
      await transmit.broadcast(channel, payload)
      return true
    } catch (error) {
      // Persistence is authoritative; clients can refetch when the secondary
      // realtime transport is temporarily unavailable.
      logger.error({ err: error, channel }, 'Realtime broadcast failed')
      return false
    }
  }
}
