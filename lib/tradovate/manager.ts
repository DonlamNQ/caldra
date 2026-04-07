/**
 * Singleton module-level qui persiste les connexions WebSocket Tradovate
 * entre les requêtes HTTP dans le même processus Node.js.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient } from '@supabase/supabase-js'
import { TradovateClient } from './client'
import { decryptPassword } from './crypto'

// Map userId → client actif
const activeConnections = new Map<string, TradovateClient>()

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const tradovateManager = {
  /**
   * Démarre un client et l'enregistre dans la Map.
   * Si un client existait déjà pour ce user, il est déconnecté d'abord.
   */
  start(
    userId: string,
    accessToken: string,
    isDemo: boolean,
    caldraApiKey: string,
  ): TradovateClient {
    tradovateManager.stop(userId)
    const supabase = getServiceSupabase()
    const client = new TradovateClient(userId, isDemo, caldraApiKey, supabase as any)
    client.connect(accessToken)
    activeConnections.set(userId, client)
    return client
  },

  /** Arrête et supprime un client. */
  stop(userId: string) {
    const existing = activeConnections.get(userId)
    if (existing) {
      existing.disconnect()
      activeConnections.delete(userId)
    }
  },

  /** Retourne le client actif pour un user, ou undefined. */
  get(userId: string): TradovateClient | undefined {
    return activeConnections.get(userId)
  },

  isConnected(userId: string): boolean {
    return activeConnections.get(userId)?.isConnected ?? false
  },

  lastSyncAt(userId: string): Date | null {
    return activeConnections.get(userId)?.lastSyncAt ?? null
  },

  /**
   * À appeler au démarrage du serveur pour relancer les connexions actives
   * stockées en base. Utile en cas de restart (non-Vercel).
   */
  async restoreFromDb() {
    const supabase = getServiceSupabase()
    const { data: rows } = await supabase
      .from('tradovate_connections')
      .select('*')
      .eq('is_active', true)

    if (!rows?.length) return

    for (const row of rows) {
      if (activeConnections.has(row.user_id)) continue

      try {
        const password = decryptPassword(row.tradovate_password_hash)
        const caldraKey = decryptPassword(row.caldra_api_key_enc)

        const client = new TradovateClient(row.user_id, row.is_demo, caldraKey, supabase as any)
        const { accessToken } = await client.authenticate(
          row.tradovate_username,
          password,
          row.tradovate_api_key,
        )

        await supabase
          .from('tradovate_connections')
          .update({ access_token: accessToken })
          .eq('user_id', row.user_id)

        client.connect(accessToken)
        activeConnections.set(row.user_id, client)
        console.log(`[TradovateManager] Connexion restaurée pour user=${row.user_id}`)
      } catch (err) {
        console.error(`[TradovateManager] Impossible de restaurer user=${row.user_id}:`, err)
      }
    }
  },
}
