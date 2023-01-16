import fs from 'fs'

import { suite, test, timeout } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import { Severity } from 'allure-js-commons'

import { description, feature, log, severity, step } from '../.jest/jest-custom-reporter'
import { Hooks } from './hooks'
import { SupabaseClient } from '@supabase/supabase-js'

@suite('data')
class Data extends Hooks {
  @feature('Data Restoration')
  @severity(Severity.CRITICAL)
  @description('Check if user can login after pause/restore')
  @test
  async 'login after restore'() {
    log('Get user data from file')
    const userData = JSON.parse(fs.readFileSync('temp/test_profile', { encoding: 'utf-8' }))

    const supabase = this.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ANON)
    log('Check if user can login after pause/restore')
    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: userData.password,
    })
    expect(signInError).toBeNull()
    expect(user.email.toLowerCase()).toMatch(userData.email.toLowerCase())
    expect(user.id).toMatch(userData.id)
  }

  @feature('Data Restoration')
  @severity(Severity.CRITICAL)
  @description('Check if data is restored after pause/resume')
  @test
  async 'profile data restored'() {
    log('Get user data from file')
    const userData = JSON.parse(fs.readFileSync('temp/test_profile', { encoding: 'utf-8' }))

    const supabase = this.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ANON)
    log('Old user login')
    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: userData.password,
    })
    expect(signInError).toBeNull()

    // get user's profile
    const { data, error } = await this.getUserProfile(supabase)
    expect(error).toBeNull()
    expect(data.username).toMatch(userData.username)
    expect(data.id).toMatch(userData.id)
  }

  @feature('Data Restoration')
  @severity(Severity.CRITICAL)
  @description('Check if storage data is restored after pause/resume')
  @test
  async 'storage data restored'() {
    log('Get storage data from file')
    const file = JSON.parse(fs.readFileSync('temp/test_file', { encoding: 'utf-8' }))
    const supabase = this.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ADMIN)

    log('Check if storage data is restored after pause/resume')
    const { data, error } = await supabase.storage.from(file.bucket).download(file.path)
    expect(error).toBeNull()
    expect(await data.text()).toMatch(file.data)
  }

  @feature('Data Restoration')
  @severity(Severity.CRITICAL)
  @description('Check if procedure is restored after pause/resume')
  @test
  async 'procedures data restored'() {
    log('Get procedure data from file')
    const procedure = JSON.parse(fs.readFileSync('temp/test_procedure', { encoding: 'utf-8' }))
    const supabase = this.createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_ADMIN)

    log('Check if procedure data is restored after pause/resume')
    const result = await this.callRpc(supabase, procedure.name)
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data).toBeGreaterThanOrEqual(1)
  }

  @step('call supabase rpc')
  private async callRpc(
    supabase: SupabaseClient,
    name: string,
    args?: any,
    options?: {
      head?: boolean
      count?: 'exact' | 'planned' | 'estimated'
    }
  ) {
    let result = await supabase.rpc(name, args, options)
    for (let i = 1; i <= 5; i++) {
      if (result.error) {
        await new Promise((resolve) => setTimeout(resolve, 0.5 * 1000 * i))
        result = await supabase.rpc(name, args, options)
      } else {
        break
      }
    }
    return result
  }
}
