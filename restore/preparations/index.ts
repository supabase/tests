import assert from 'assert'
import dotenv from 'dotenv'

import { Prep } from './prep'
import { main as triggers } from './triggers'
import { main as data } from './data'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })
const supaDBHost = process.env.SUPABASE_DB_HOST
assert(supaDBHost, 'SUPABASE_DB_HOST is not set, check env vars')
;(async () => {
  const prep = new Prep()
  try {
    await triggers(prep)
    await data(prep)
  } finally {
    await prep.close()
  }
})()
