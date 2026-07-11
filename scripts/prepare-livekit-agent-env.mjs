#!/usr/bin/env node
import { chmodSync, readFileSync, writeFileSync } from 'node:fs'

const allowedKeys = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'LIVEKIT_TRANSCRIPTION_MODEL',
  'LIVEKIT_TRANSCRIPTION_LANGUAGE',
  'LIVEKIT_SUMMARY_MODEL'
]
const requiredKeys = new Set(['SUPABASE_URL', 'SUPABASE_SECRET_KEY'])
const values = new Map()

for (const rawLine of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue

  const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
  if (!match || !allowedKeys.includes(match[1])) continue

  let value = match[2].trim()
  const quote = value[0]
  if (
    (quote === '"' || quote === "'") &&
    value.endsWith(quote) &&
    value.length >= 2
  ) {
    value = value.slice(1, -1)
  }
  if (value.includes('\n') || value.includes('\r')) {
    throw new Error(`${match[1]} cannot contain a newline.`)
  }
  values.set(match[1], value)
}

for (const key of requiredKeys) {
  if (!values.get(key)) throw new Error(`${key} is missing from .env.`)
}

const output = allowedKeys
  .filter((key) => values.has(key))
  .map((key) => `${key}=${values.get(key)}`)
  .join('\n')

writeFileSync('.env.agent', `${output}\n`, { mode: 0o600 })
chmodSync('.env.agent', 0o600)
console.info('Prepared .env.agent with LiveKit agent-only settings.')
