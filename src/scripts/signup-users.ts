import assert from 'assert'
import dotenv from 'dotenv'
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

console.log(`env file: .env.${process.env.NODE_ENV}`)
dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const anonKey = process.env.SUPABASE_KEY_ANON
const url = process.env.SUPABASE_URL
assert(anonKey, 'SUPABASE_KEY_ANON is not set')
assert(url, 'SUPABASE_URL is not set')
const number = process.env.USERS_COUNT || '100'
const usersCount = parseInt(number)

const options: SupabaseClientOptions<'public'> = {
  auth: {
    persistSession: false,
  },
}
const supabase = createClient(url, anonKey, options)

;(async () => {
  for (let i = 0; i < usersCount; i++) {
    const fakeUser = {
      email: faker.internet.exampleEmail(),
      password: faker.internet.password(),
      username: faker.internet.userName(),
    }
    const { error, data } = await supabase.auth.signUp(fakeUser)
    assert(error === null, error?.message)
    assert(data.user !== null, 'data is null')
    console.log(`${i} | ${data.user.id} | ${data.user.email} | ${fakeUser.password}`)
  }
})()
