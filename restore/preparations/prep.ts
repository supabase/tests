import postgres from 'postgres'
import { faker } from '@faker-js/faker'
import {
  AuthResponse,
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
} from '@supabase/supabase-js'

import retriedFetch from '../../src/common/retriedFetch'
import assert from 'assert'

export class Prep {
  sql = postgres({
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT),
    database: 'postgres',
    username: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASS,
    types: {
      bytea: {
        to: 17,
        from: 17,
        serialize: (x: any) =>
          x instanceof Uint8Array
            ? '\\x' + Buffer.from(x, x.byteOffset, x.byteLength).toString('hex')
            : x,
        parse: (x: any) => Buffer.from(x.slice(2), 'hex'),
      } as any,
    },
  })

  createSupaClient(
    url: string,
    key: string,
    options: SupabaseClientOptions<'public'> = {}
  ): SupabaseClient {
    options.auth = options.auth || {}
    options.auth.persistSession = false
    options.global = options.global || {}
    options.global.fetch = retriedFetch

    return createClient(url, key, options)
  }

  async createUser(data: object = {}): Promise<{
    email: string
    password: string
    username: string
    id: string
  }> {
    const supabase = this.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ANON)

    const fakeUser = {
      email: faker.internet.exampleEmail(),
      password: faker.internet.password(),
      username: faker.internet.userName(),
      id: '',
    }
    const {
      error: signUpError,
      data: { user },
    } = await this.signUp(supabase, fakeUser, {
      data: data,
    })
    assert(!signUpError, signUpError?.message)
    assert(user, 'user is not defined')
    fakeUser.id = user.id

    return fakeUser
  }

  async signUp(
    supabase: SupabaseClient,
    {
      email = faker.internet.exampleEmail(),
      password = faker.internet.password(),
    }: {
      email?: string
      password?: string
    } = {},
    options: {
      redirectTo?: string
      data?: object
      captchaToken?: string
    } = {}
  ): Promise<AuthResponse> {
    return supabase.auth.signUp({
      email: email,
      password: password,
      options: options,
    })
  }

  async insertProfile(
    supabase: SupabaseClient,
    user: {
      id: string
    },
    fakeUser: {
      username: string
    }
  ): Promise<{ data: any; error: any }> {
    return await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: fakeUser.username,
      })
      .select()
  }

  async createSignedInSupaClient() {
    // create user
    const fakeUser = await this.createUser()

    // sign in as user
    const supabase = this.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ANON)
    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email: fakeUser.email,
      password: fakeUser.password,
    })
    assert(!signInError, signInError?.message)
    fakeUser.id = user.id

    return { supabase, user: fakeUser }
  }

  async close() {
    try {
      await this.sql.end({ timeout: 1000 })
      return Promise.resolve(null)
    } catch (err) {
      console.log(err)
      return Promise.resolve(null)
    }
  }
}
