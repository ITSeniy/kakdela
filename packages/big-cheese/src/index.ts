#!/usr/bin/env tsx
// big-cheese — админский CLI для прод-операций.
// На текущей фазе реализован только `backup` (T-084), остальное —
// заглушки для будущих задач.

import { spawn } from 'node:child_process'

const HELP = `
big-cheese — админский CLI

Команды:
  backup [--compose-file <path>]   pg_dump + sync minio через cron-контейнер
  promote <user> admin             повысить пользователя       (TODO)
  kick    <user>                   выгнать пользователя        (TODO)
  channel create <name>            создать канал               (TODO)
  help                             эта справка

Пример:
  pnpm big-cheese backup
  pnpm big-cheese backup --compose-file docker-compose.prod.yml
`

const cmd = process.argv[2]

function parseComposeFile(args: string[]): string {
  const idx = args.findIndex((a) => a === '--compose-file' || a === '-f')
  if (idx >= 0 && args[idx + 1]) return args[idx + 1]!
  return 'docker-compose.prod.yml'
}

async function runBackup(rawArgs: string[]): Promise<void> {
  const composeFile = parseComposeFile(rawArgs)
  const args = ['compose', '-f', composeFile, 'exec', '-T', 'backup', 'kd-backup']
  console.log(`[big-cheese] $ docker ${args.join(' ')}`)
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn('docker', args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (c) => resolve(c ?? 1))
  })
  if (code !== 0) {
    console.error(`[big-cheese] backup exited with code ${code}`)
    process.exit(code)
  }
}

async function notImplemented(name: string): Promise<void> {
  console.error(`[big-cheese] '${name}' пока не реализовано — см. TODO в src/index.ts`)
  process.exit(2)
}

async function main(): Promise<void> {
  switch (cmd) {
    case 'backup':
      await runBackup(process.argv.slice(3))
      break

    case 'promote':
    case 'kick':
    case 'channel':
      await notImplemented(cmd)
      break

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP)
      break

    default:
      console.error(`Неизвестная команда: ${cmd}`)
      console.log(HELP)
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
