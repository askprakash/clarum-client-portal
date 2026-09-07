import sql from 'mssql'

let poolPromise

function connectionString() {
  const value = process.env.AZURE_SQL_CONNECTION_STRING
  if (!value) {
    throw new Error('Database is not configured (AZURE_SQL_CONNECTION_STRING app setting is missing)')
  }
  return value
}

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(connectionString()).connect()
    poolPromise.catch(() => {
      // Allow the next call to retry the connection instead of caching a rejected promise forever.
      poolPromise = undefined
    })
  }
  return poolPromise
}

export async function query(text, params = {}) {
  const pool = await getPool()
  const request = pool.request()
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value)
  }
  return request.query(text)
}

export { sql }
