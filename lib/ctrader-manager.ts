// lib/ctrader-manager.ts — Singleton qui gère les intervalles de polling cTrader en mémoire

interface PollingSession {
  intervalId: NodeJS.Timeout
  userId: string
  accountId: string
  startedAt: Date
}

class CTraderManager {
  private sessions = new Map<string, PollingSession>()

  start(userId: string, accountId: string, intervalId: NodeJS.Timeout) {
    const existing = this.sessions.get(userId)
    if (existing) {
      clearInterval(existing.intervalId)
    }
    this.sessions.set(userId, { intervalId, userId, accountId, startedAt: new Date() })
    console.log(`[cTraderManager] Polling démarré pour user=${userId} account=${accountId}`)
  }

  stop(userId: string) {
    const session = this.sessions.get(userId)
    if (session) {
      clearInterval(session.intervalId)
      this.sessions.delete(userId)
      console.log(`[cTraderManager] Polling arrêté pour user=${userId}`)
    }
  }

  isPolling(userId: string): boolean {
    return this.sessions.has(userId)
  }

  getSession(userId: string): PollingSession | undefined {
    return this.sessions.get(userId)
  }
}

// Singleton global — survit aux hot-reloads en dev grâce au global scope
declare global {
  // eslint-disable-next-line no-var
  var __ctraderManager: CTraderManager | undefined
}

export const ctraderManager: CTraderManager =
  global.__ctraderManager ?? (global.__ctraderManager = new CTraderManager())
