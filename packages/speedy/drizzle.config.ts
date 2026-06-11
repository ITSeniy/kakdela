import { config } from 'dotenv'
import type { Config } from 'drizzle-kit'

// CWD when invoked via `pnpm --filter @kakdela/speedy db:generate` is packages/speedy/
config({ path: '../../.env' })

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env['DATABASE_URL']! },
  verbose: true,
  strict: true,
} satisfies Config
