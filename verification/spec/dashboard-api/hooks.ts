import crossFetch from '../../../src/common/retriedFetch'
import { faker } from '@faker-js/faker'

import {
  ApiError,
  createClient,
  Session,
  SupabaseClient,
  SupabaseClientOptions,
  User,
} from '@supabase/supabase-js'

import { step } from '../../.jest/jest-custom-reporter'
import { ProjectResponse } from '../../src/types/project'

export abstract class Hooks {
  protected static supaPlatformURI = process.env.SUPA_PLATFORM_URI
  protected static supaMetaURI = process.env.SUPA_META_URI
  protected static projectDomain = process.env.SUPA_PROJECT_DOMAIN
  protected static accessToken: string
  protected static headers: HeadersInit

  static async before() {
    this.accessToken = process.env.ACCESS_TOKEN
    this.headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'content-type': 'application/json',
    }
  }

  // steps

  static async getProjectApiKey(ref: string, tags: string): Promise<string> {
    const projectResp = await crossFetch(`${this.supaPlatformURI}/props/project/${ref}/settings`, {
      headers: this.headers,
    })
    expect(projectResp.status).toBe(200)
    const project: ProjectResponse = await projectResp.json()

    return (
      project.services
        .filter((s: any) => s.name === 'Default API')[0]
        ?.service_api_keys?.filter((s) => s.tags === tags)[0]?.api_key ?? ''
    )
  }

  @step('Create Supabase client')
  createSupaClient(url: string, key: string, options: SupabaseClientOptions = {}): SupabaseClient {
    return createClient(url, key, options)
  }

  @step((token: string) => `verify with token {${token}}`)
  async verify(token: string): Promise<Response> {
    return crossFetch(`${process.env.SUPABASE_GOTRUE}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'signup',
        token: token,
      }),
    })
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
    } = {}
  ): Promise<{
    user: User
    session: Session
    error: ApiError
  }> {
    return supabase.auth.signUp(
      {
        email: email,
        password: password,
      },
      options
    )
  }

  @step('Check if I am being able to log out')
  async signOut(supabase: SupabaseClient): Promise<{ error: any }> {
    return supabase.auth.signOut()
  }

  @step('Get user data, if there is a logged in user')
  getUser(supabase: SupabaseClient) {
    return supabase.auth.user()
  }
}
