// this file is run before project will be restarted and
import fs from 'fs'
import assert from 'assert'

import { faker } from '@faker-js/faker'

import { Prep } from './prep'

// is used to generate all data needed for the triggers tests
export async function main(prep: Prep) {
  await createProfile(prep)
  await createVaultKey(prep)
}

async function createProfile(prep: Prep) {
  // check out integration/supabase/migrartions/20230104141145_data.sql to see profile_insert trigger
  console.log('Create profile to trigger profile_insert trigger')
  const { supabase, user } = await prep.createSignedInSupaClient()

  // insert profile to trigger profile_insert trigger
  const { error: errorInsert } = await prep.insertProfile(supabase, user, user)
  assert(errorInsert === null)
}

async function createVaultKey(prep: Prep) {
  // create pgsodium key to have a reference value
  console.log('Create pgsodium key to have a reference value')
  const rawKey = faker.datatype.uuid()
  const data = await prep.sql`
        select * 
        from pgsodium.create_key(
          name:='test_key'::text, 
          raw_key:='${prep.sql.types.bytea(rawKey)}'::bytea);
      `
  assert(data.count === 1, 'Error creating pgsodium key')

  // save raw_key to file
  console.log('Save raw key to file')
  fs.writeFileSync('temp/test_key', rawKey, { encoding: 'utf-8' })
}
