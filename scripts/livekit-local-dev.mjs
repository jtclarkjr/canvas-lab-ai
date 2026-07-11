#!/usr/bin/env node
import { spawn } from 'node:child_process'

const livekitEnv = {
  ...process.env,
  LIVEKIT_URL: 'ws://127.0.0.1:7880',
  LIVEKIT_API_KEY: 'devkey',
  LIVEKIT_API_SECRET: 'secret'
}

const children = []
let shuttingDown = false

async function localLiveKitIsRunning() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1000)
    const response = await fetch('http://127.0.0.1:7880', {
      signal: controller.signal
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

function writePrefixed(name, chunk, stream) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line) {
      stream.write(`[${name}] ${line}\n`)
    }
  }
}

function start(name, command, args, options = {}) {
  const child = spawn(command, args, {
    env: options.env ?? process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  children.push({ name, child })
  child.stdout.on('data', (chunk) => writePrefixed(name, chunk, process.stdout))
  child.stderr.on('data', (chunk) => writePrefixed(name, chunk, process.stderr))
  child.on('error', (error) => {
    console.error(`[${name}] could not start: ${error.message}`)
    shutdown(1)
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    console.error(
      `[${name}] exited with ${signal ? `signal ${signal}` : `code ${code}`}`
    )
    shutdown(code ?? 1)
  })

  return child
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true

  for (const { child } of children) {
    if (!child.killed) {
      child.kill('SIGINT')
    }
  }

  setTimeout(() => {
    for (const { child } of children) {
      if (!child.killed) {
        child.kill('SIGTERM')
      }
    }
    process.exit(code)
  }, 2000).unref()
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

if (await localLiveKitIsRunning()) {
  console.log('[livekit] using existing local server on 127.0.0.1:7880')
} else {
  start('livekit', 'livekit-server', ['--dev'])
}
start('app', 'vp', ['dev', '--host', '127.0.0.1'], { env: livekitEnv })
start(
  'transcriber',
  '/bin/sh',
  ['-c', 'vp run agent:build && node dist-agent/canvas-transcriber.js dev'],
  { env: livekitEnv }
)
