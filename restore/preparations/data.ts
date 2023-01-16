// this file is run before project will be restarted and
import fs from 'fs'
import assert from 'assert'

import { faker } from '@faker-js/faker'

import { Prep } from './prep'

// is used to generate all data needed for the triggers tests
export async function main(prep: Prep) {
  await createProfile(prep)
  await addFileToStorage(prep)
  await createProcedure(prep)
}

async function createProfile(prep: Prep) {
  // check out integration/supabase/migrartions/20230104141145_data.sql to see profile_insert trigger
  console.log('Check if there are rows with duplicate username in profile_insert table')
  const { supabase, user } = await prep.createSignedInSupaClient()

  // insert profile to trigger profile_insert trigger
  const { error: errorInsert } = await prep.insertProfile(supabase, user, user)
  assert(errorInsert === null)
  fs.writeFileSync('temp/test_profile', JSON.stringify(user), { encoding: 'utf-8' })
}

async function addFileToStorage(prep: Prep) {
  console.log('Add file to storage')
  const supabase = prep.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ADMIN)
  const bucket = await createBucket(prep)

  const file = {
    path: word() + '.txt',
    data: faker.lorem.paragraph(),
  }
  console.log('upload file', file.path)
  const { error } = await supabase.storage.from(bucket.name).upload(file.path, file.data)
  assert(
    error === null,
    `Error uploading file: ${error?.message}, ${error?.name}\n, ${error?.stack}`
  )
  fs.writeFileSync(
    'temp/test_file',
    JSON.stringify({
      bucket: bucket.name,
      path: file.path,
      data: file.data,
    }),
    { encoding: 'utf-8' }
  )
}

async function createBucket(prep: Prep, pub = true) {
  const supabase = prep.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ADMIN)
  const bucketName = word()

  console.log('creating bucket', bucketName)
  let { data: bucket, error } = await supabase.storage.createBucket(bucketName, {
    public: pub,
  })
  if (error) {
    console.log(error.name, error.message)
    const { data: bucketTemp, error: errorTemp } = await supabase.storage.createBucket(bucketName, {
      public: pub,
    })
    bucket = bucketTemp
    error = errorTemp
  }
  assert(
    error === null,
    `Error creating bucket: ${error?.message}, ${error?.name}\n, ${error?.stack}`
  )

  console.log('list buckets')
  let { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    console.log(listErr.name, listErr.message)
    const { data: bucketsTemp, error: listErrTemp } = await supabase.storage.listBuckets()
    buckets = bucketsTemp
    listErr = listErrTemp
  }
  assert(listErr === null, `Error listing buckets: ${listErr?.message}, ${listErr?.name}`)
  return buckets?.find((b) => b.name === bucketName)
}

function word() {
  return faker.unique(faker.random.word).replace(/[^a-zA-Z0-9]/g, '')
}

async function createProcedure(prep: Prep) {
  console.log('Create procedure')
  await prep.sql`
  CREATE OR REPLACE FUNCTION public.test_procedure_restore() RETURNS int language plpgsql as $$
  declare
     profile_count integer;
  begin
     select count(*) 
     into profile_count
     from profiles;
     
     return profile_count;
  end;
  $$;`
  await prep.sql`NOTIFY pgrst, 'reload schema';`

  fs.writeFileSync(
    'temp/test_procedure',
    JSON.stringify({
      name: 'test_procedure_restore',
    }),
    { encoding: 'utf-8' }
  )
}
