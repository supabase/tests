import postgres from 'postgres'
import crossFetch from 'cross-fetch'
import { faker } from '@faker-js/faker'
import {
  AuthResponse,
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
  User,
  UserAttributes,
  UserResponse,
} from '@supabase/supabase-js'

import retriedFetch from '../../src/common/retriedFetch'
import { JasmineAllureReporter, step } from '../.jest/jest-custom-reporter'

export abstract class Hooks {
  static sql = postgres({
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

  static async after(done: any): Promise<any> {
    try {
      await Hooks.sql.end({ timeout: 1000 })
      return Promise.resolve(null).then(done)
    } catch (err) {
      console.log('failed to close sql conn', err)
      return Promise.resolve(null).then(done)
    }
  }

  @step('Create Supabase client')
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

  @step('Create a valid user')
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
    expect(signUpError).toBeNull()
    expect(user).not.toBeNull()
    fakeUser.id = user.id

    return fakeUser
  }

  // todo: rework this
  @step((token: string) => `verify with token ${token}`)
  async verify(token: string, email: string): Promise<Response> {
    return crossFetch(`${process.env.SUPABASE_GOTRUE}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'signup',
        token: token,
        email: email,
      }),
    })
  }

  @step((user: User) => `get confirmation token for user ${user.id}`)
  async getConfirmationToken(user: User): Promise<[{ confirmation_token: any }]> {
    return Hooks.sql`
      select confirmation_token 
      from auth.users
      where id = ${user.id}
    `
  }

  @step('I sign up with a valid email and password')
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

  @step('Check if I am being able to log out')
  async signOut(supabase: SupabaseClient): Promise<{ error: any }> {
    return supabase.auth.signOut()
  }

  @step('Get user data, if there is a logged in user')
  getUser(supabase: SupabaseClient) {
    return supabase.auth.getUser()
  }

  @step((user: User) => `Get user by ID (${user.id}) from Supabase auth schema`)
  async selectUser(user: User): Promise<[{ email: string }]> {
    return Hooks.sql`
        select
        email
      from auth.users
      where
        id = ${user.id}
    `
  }

  @step('I sign up with a valid email and password')
  async signUpByPhone(
    supabase: SupabaseClient,
    {
      phone = faker.phone.phoneNumber(),
      password = faker.internet.password(),
    }: {
      phone?: string
      password?: string
    } = {},
    options: {
      redirectTo?: string
      data?: object
    } = {}
  ): Promise<AuthResponse> {
    return supabase.auth.signUp({
      phone: phone,
      password: password,
      options: options,
    })
  }

  @step('User inserts profile')
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

  @step('I can get my profile via postgREST')
  async getUserProfile(supabase: SupabaseClient): Promise<{ data: any; error: any }> {
    return supabase.from('profiles').select().maybeSingle()
  }

  @step('Update user info')
  async updateUser(supabase: SupabaseClient, attr: UserAttributes): Promise<UserResponse> {
    return supabase.auth.updateUser(attr)
  }

  @step('Create signed in supabase client')
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
    expect(signInError).toBeNull()
    fakeUser.id = user.id

    return { supabase, user: fakeUser }
  }
}
