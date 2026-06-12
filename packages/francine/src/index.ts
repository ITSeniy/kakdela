#!/usr/bin/env tsx
import { dirname, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cmd = process.argv[2]

const HELP = `
francine — CLI КакДела

Использование:
  pnpm francine <команда>

Команды:
  migrate              применить миграции БД
  seed                 заполнить тестовыми данными (только dev)
  invite create        создать инвайт-код
  help                 эта справка
`

const INVITE_HELP = `
francine invite create — создать инвайт-код

Использование:
  pnpm francine invite create --server <uuid> [--expires-in <Nd>] [--max-uses <N>]

Примеры:
  pnpm francine invite create --server 550e8400-e29b-41d4-a716-446655440000
  pnpm francine invite create --server <uuid> --expires-in 7d --max-uses 10
`

// Ровно 32 символа (см. speedy/routes/invites.ts) — 31-символьный алфавит
// терял символ при выпадении индекса 31 и выдавал 7-значные коды.
const BASE32 = 'abcdefghjkmnpqrstuvwxyz023456789'

function generateCode(): string {
  const bytes = randomBytes(5)
  let num = 0n
  for (const byte of bytes) num = (num << 8n) | BigInt(byte)
  let code = ''
  for (let i = 7; i >= 0; i--) code += BASE32.charAt(Number((num >> BigInt(i * 5)) & 0x1fn))
  return code
}

async function runMigrate() {
  const url = process.env['DATABASE_URL']
  if (!url) {
    console.error('DATABASE_URL не задан — запусти через pnpm francine migrate')
    process.exit(1)
  }

  const { default: postgres } = await import('postgres')
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')

  const migrationsFolder = resolve(__dirname, '../../speedy/drizzle')
  const client = postgres(url, { max: 1 })
  const db = drizzle(client)

  console.log('Applying migrations from', migrationsFolder)
  await migrate(db, { migrationsFolder })
  await client.end()
  console.log('Migrations applied successfully')
}

async function runInviteCreate(rawArgs: string[]) {
  const url = process.env['DATABASE_URL']
  if (!url) {
    console.error('DATABASE_URL не задан')
    process.exit(1)
  }

  let serverId: string | undefined
  let expiresInDays: number | undefined
  let maxUses: number | undefined

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    const next = rawArgs[i + 1]
    if ((arg === '--server' || arg === '--server-id') && next) {
      serverId = next
      i++
    } else if (arg === '--expires-in' && next) {
      const match = /^(\d+)d$/i.exec(next)
      if (match?.[1]) {
        expiresInDays = parseInt(match[1], 10)
      } else {
        console.error('--expires-in должен быть в формате Nd (например: 7d)')
        process.exit(1)
      }
      i++
    } else if (arg === '--max-uses' && next) {
      const parsed = parseInt(next, 10)
      if (isNaN(parsed) || parsed < 1) {
        console.error('--max-uses должен быть положительным числом')
        process.exit(1)
      }
      maxUses = parsed
      i++
    }
  }

  if (!serverId) {
    console.error('Нужен --server <uuid>')
    console.log(INVITE_HELP)
    process.exit(1)
  }

  const { default: sql } = await import('postgres')
  const client = sql(url, { max: 1 })

  const serverRows = await client<Array<{ id: string; name: string }>>`
    SELECT id, name FROM servers WHERE id = ${serverId}
  `

  if (!serverRows[0]) {
    console.error(`Сервер ${serverId} не найден`)
    await client.end()
    process.exit(1)
  }

  const expiresAt = expiresInDays != null
    ? new Date(Date.now() + expiresInDays * 86_400_000)
    : null

  let code: string | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateCode()
    const existing = await client<Array<{ code: string }>>`
      SELECT code FROM invites WHERE code = ${candidate}
    `
    if (!existing[0]) {
      code = candidate
      break
    }
  }

  if (!code) {
    console.error('Не удалось сгенерировать уникальный код (3 попытки)')
    await client.end()
    process.exit(1)
  }

  await client`
    INSERT INTO invites (code, server_id, created_by, expires_at, max_uses)
    VALUES (${code}, ${serverId}, NULL, ${expiresAt}, ${maxUses ?? null})
  `

  await client.end()

  const server = serverRows[0]
  console.log(`\nИнвайт создан:`)
  console.log(`  Сервер:   ${server.name} (${serverId})`)
  console.log(`  Код:      ${code}`)
  if (expiresAt) console.log(`  Истекает: ${expiresAt.toISOString()}`)
  if (maxUses != null) console.log(`  Макс. использований: ${maxUses}`)
}

async function main() {
  switch (cmd) {
    case 'migrate':
      await runMigrate()
      break

    case 'seed': {
      const { runSeed } = await import('./seed.js')
      await runSeed()
      break
    }

    case 'invite': {
      const sub = process.argv[3]
      if (sub === 'create') {
        await runInviteCreate(process.argv.slice(4))
      } else {
        console.error(`Неизвестная подкоманда invite: ${sub ?? ''}`)
        console.log(INVITE_HELP)
        process.exit(1)
      }
      break
    }

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
