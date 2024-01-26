import assert from 'assert'
import dotenv from 'dotenv'
import postgres from 'postgres'

console.log(`env file: .env.${process.env.NODE_ENV}`)
dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const dbHost = process.env.SUPABASE_DB_HOST
assert(dbHost, 'SUPABASE_DB_HOST is not set')
const dbPort = process.env.SUPABASE_DB_PORT
assert(dbPort, 'SUPABASE_DB_PORT is not set')

const dbName = process.env.SUPABASE_DB_NAME || 'postgres'
const dbUser = process.env.SUPABASE_DB_USER || 'postgres'
const dbPass = process.env.SUPABASE_DB_PASS
assert(dbPass, 'SUPABASE_DB_PASS is not set')

const migrations = process.env.MIGRATIONS_FILE
assert(migrations, 'MIGRATIONS_FILE is not set')
;(async () => {
  const sql = postgres({
    host: dbHost,
    port: parseInt(dbPort),
    database: dbName,
    username: dbUser,
    password: dbPass,
  })

  const startTime = Date.now()
  const maxTime = 3 * 60 * 1000 // 3 minutes

  // cause pooler may not be ready yet for the project
  while (Date.now() - startTime < maxTime) {
    try {
      await sql.file(migrations).execute()
      break
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  await sql.end({ timeout: 1000 })
})()
