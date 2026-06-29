import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

// Chiffrement AES-256-GCM générique pour les secrets de connexion (token IBKR Flex, etc.).
// Réutilise MT5_ENC_KEY (déjà déployée Vercel + VPS). Format base64 : iv(12) || ct || tag(16).
// Le worker Node déchiffre avec le même schéma (cf. worker/ibkr-worker.js → decryptSecret).

function key(): Buffer {
  const secret = process.env.MT5_ENC_KEY
  if (!secret) throw new Error('MT5_ENC_KEY manquant')
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, enc, tag]).toString('base64')
}

export function decryptSecret(b64: string): string {
  const data = Buffer.from(b64, 'base64')
  const iv = data.subarray(0, 12)
  const tag = data.subarray(data.length - 16)
  const ct = data.subarray(12, data.length - 16)
  const d = createDecipheriv('aes-256-gcm', key(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
}
