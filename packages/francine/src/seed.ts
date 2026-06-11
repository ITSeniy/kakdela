export async function runSeed() {
  const url = process.env['DATABASE_URL']
  if (!url) {
    console.error('DATABASE_URL не задан')
    process.exit(1)
  }

  const { default: postgres } = await import('postgres')
  const client = postgres(url, { max: 1 })

  try {
    const [row] = await client<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM servers`
    if (row && parseInt(row.count, 10) > 0) {
      console.log('already seeded — пропускаем')
      return
    }

    const serverName = process.env['KAKDELA_DEFAULT_SERVER_NAME'] ?? 'как у нас'

    const [server] = await client<[{ id: string }]>`
      INSERT INTO servers (name) VALUES (${serverName}) RETURNING id
    `

    if (!server) throw new Error('INSERT servers вернул пустой результат')

    const { id: serverId } = server

    await client`
      INSERT INTO channels (server_id, name, kind, category, position) VALUES
        (${serverId}, 'общее', 'text', 'беседы', 0),
        (${serverId}, 'флуд',  'text', 'беседы', 1),
        (${serverId}, 'общая комната', 'voice', NULL, 0)
    `

    console.log(`Сервер создан: "${serverName}" (${serverId})`)
    console.log(`Каналы: #общее, #флуд, голос «общая комната»`)
    console.log(``)
    console.log(`Следующий шаг — создать первый инвайт:`)
    console.log(`  pnpm francine invite create --server ${serverId} --max-uses 1`)
  } finally {
    await client.end()
  }
}
