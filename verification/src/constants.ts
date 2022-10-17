export const defaultTables = [
  {
    name: 'refresh_tokens',
    schema: 'auth',
  },
  {
    name: 'audit_log_entries',
    schema: 'auth',
  },
  {
    name: 'instances',
    schema: 'auth',
  },
  {
    name: 'buckets',
    schema: 'storage',
  },
  {
    name: 'objects',
    schema: 'storage',
  },
  {
    name: 'migrations',
    schema: 'storage',
  },
  {
    name: 'users',
    schema: 'auth',
  },
  {
    name: 'schema_migrations',
    schema: 'auth',
  },
  {
    name: 'identities',
    schema: 'auth',
  },
]

export const defaultSchemas = [
  {
    name: 'public',
    owner: 'postgres',
  },
  {
    name: 'extensions',
    owner: 'postgres',
  },
  // {
  //   name: 'pgbouncer',
  //   owner: 'pgbouncer',
  // },
  {
    name: 'graphql_public',
    owner: 'supabase_admin',
  },
  {
    name: 'graphql',
    owner: 'supabase_admin',
  },
  {
    name: 'realtime',
    owner: 'supabase_admin',
  },
  {
    name: 'storage',
    owner: 'supabase_admin',
  },
  {
    name: 'auth',
    owner: 'supabase_admin',
  },
]
