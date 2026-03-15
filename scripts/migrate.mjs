// scripts/migrate.mjs
// Applies supabase/migrations/00001_initial_schema.sql directly to the remote database.
// Usage: node scripts/migrate.mjs
//
// Requires DATABASE_URL in .env.local:
//   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.twoesyyxaypygyajhdtd.supabase.co:5432/postgres

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load .env.local manually
function loadEnv() {
  try {
    const env = readFileSync(join(ROOT, '.env.local'), 'utf-8')
    for (const line of env.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      const value = rest.join('=').trim()
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local not found — rely on process.env
  }
}

loadEnv()

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL is not set in .env.local')
  console.error('\nAdd this line to .env.local (get password from Supabase Dashboard → Settings → Database):')
  console.error('DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.twoesyyxaypygyajhdtd.supabase.co:5432/postgres\n')
  process.exit(1)
}

const MIGRATION_FILE = join(ROOT, 'supabase', 'migrations', '00001_initial_schema.sql')
const sql = readFileSync(MIGRATION_FILE, 'utf-8')

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

console.log('\n📦 Peepal Migration Runner')
console.log('──────────────────────────')
console.log(`Applying: supabase/migrations/00001_initial_schema.sql`)
console.log(`Target:   db.twoesyyxaypygyajhdtd.supabase.co\n`)

/**
 * Split a SQL file into individual statements, correctly handling:
 * - Dollar-quoted strings ($$ ... $$ and $tag$ ... $tag$)
 * - Line and block comments
 */
function splitSQL(sql) {
  const statements = []
  let current = ''
  let dollarTag = null
  let i = 0

  while (i < sql.length) {
    // Inside a dollar-quoted block — look for the closing tag
    if (dollarTag !== null) {
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag
        i += dollarTag.length
        dollarTag = null
        continue
      }
      current += sql[i++]
      continue
    }

    // Check for start of dollar-quote ($$  or  $tag$)
    const dollarMatch = sql.slice(i).match(/^\$([^$]*)\$/)
    if (dollarMatch) {
      dollarTag = dollarMatch[0]
      current += dollarTag
      i += dollarTag.length
      continue
    }

    const ch = sql[i]

    // Statement terminator — only split here when NOT in a dollar-quote
    if (ch === ';') {
      const stmt = current.trim()
      // Skip statements that are ONLY comments (no real SQL)
      const nonCommentContent = stmt
        .split('\n')
        .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
        .join('\n')
        .trim()
      if (nonCommentContent.length > 0) {
        statements.push(stmt)
      }
      current = ''
      i++
      continue
    }

    current += ch
    i++
  }

  const remaining = current.trim()
  if (remaining.length > 0) {
    const nonComment = remaining.split('\n').filter(l => !l.trim().startsWith('--') && l.trim().length > 0).join('').trim()
    if (nonComment.length > 0) statements.push(remaining)
  }

  return statements
}

try {
  await client.connect()
  console.log('✅ Connected to database')

  const statements = splitSQL(sql).filter(s => s.length > 5)
  console.log(`   Found ${statements.length} statements to execute\n`)

  let ok = 0
  let skipped = 0
  let failed = 0

  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx]
    const preview = stmt.slice(0, 72).replace(/\s+/g, ' ')
    try {
      await client.query(stmt)
      ok++
      console.log(`  ✅ [${idx+1}/${statements.length}] ${preview}`)
    } catch (err) {
      const msg = err.message ?? ''
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('already enabled')
      ) {
        skipped++
        console.log(`  ⏭️  [${idx+1}/${statements.length}] SKIP: ${preview}`)
      } else {
        failed++
        console.error(`  ❌ [${idx+1}/${statements.length}] FAIL: ${preview}`)
        console.error(`       → ${msg}`)
      }
    }
  }

  console.log('\n───────────────────────────────')
  if (failed === 0) {
    console.log(`✅ Migration complete!`)
  } else {
    console.log(`⚠️  Migration finished with ${failed} error(s)`)  
  }
  console.log(`   Applied:  ${ok}`)
  console.log(`   Skipped:  ${skipped}`)
  console.log(`   Failed:   ${failed}\n`)

  if (failed > 0) process.exit(1)
} catch (err) {
  console.error(`\n❌ Connection failed: ${err.message}`)
  console.error('Check DATABASE_URL in .env.local\n')
  process.exit(1)
} finally {
  await client.end()
}
