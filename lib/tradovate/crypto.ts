/**
 * Chiffrement AES-256-GCM pour stocker les credentials Tradovate en base.
 * Utilise TRADOVATE_ENCRYPTION_KEY (ou SUPABASE_SERVICE_ROLE_KEY comme fallback).
 * Le résultat est réversible (contrairement à bcrypt) pour permettre la re-auth.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

function getKey(): Buffer {
  const secret =
    process.env.TRADOVATE_ENCRYPTION_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'caldra-tradovate-fallback-key-change-in-prod'
  return scryptSync(secret, 'caldra-tradovate-v1', 32)
}

export function encryptPassword(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format : base64(iv[16] + tag[16] + ciphertext)
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptPassword(encoded: string): string {
  const key = getKey()
  const buf = Buffer.from(encoded, 'base64')
  if (buf.length < 33) throw new Error('Tradovate crypto: payload trop court')
  const iv  = buf.subarray(0, 16)
  const tag = buf.subarray(16, 32)
  const enc = buf.subarray(32)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
