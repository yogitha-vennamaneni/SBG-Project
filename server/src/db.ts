/**
 * PostgreSQL connection pool — targets Neon (serverless Postgres 16).
 * Neon speaks the standard Postgres wire protocol, so the plain `pg` driver
 * works over its pooled connection string; no vendor-specific SDK required.
 */
import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('⚠️  DATABASE_URL is not set — database queries will fail until it is configured.')
}

const poolConfig: PoolConfig = {
  connectionString,
  // Neon requires SSL. Default to on; set PGSSL=false only for local Postgres.
  ssl: process.env.PGSSL === 'false' ? undefined : { rejectUnauthorized: false },
}

export const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
})

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

export default pool
