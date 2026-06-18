import { createCipheriv, createHash, randomBytes } from 'crypto'

// Chiffrement AES-256-GCM du mot de passe MT5 (investisseur).
// Format de sortie (base64) : iv(12) || ciphertext || tag(16).
// Le worker Python déchiffre avec le même schéma (cryptography.AESGCM) :
//   data = b64decode ; iv = data[:12] ; AESGCM(key).decrypt(iv, data[12:], None)
// Clé = SHA-256(MT5_ENC_KEY) → 32 octets, identique des deux côtés.

function getKey(): Buffer {
  const secret = process.env.MT5_ENC_KEY
  if (!secret) throw new Error('MT5_ENC_KEY manquant')
  return createHash('sha256').update(secret).digest()
}

export function encryptMt5Password(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, enc, tag]).toString('base64')
}
