import fs from 'fs'

import { suite, test, timeout } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import { Severity } from 'allure-js-commons'

import { description, feature, log, severity, step } from '../.jest/jest-custom-reporter'
import { Hooks } from './hooks'

@suite('triggers')
class Triggers extends Hooks {
  @feature('Triggers')
  @severity(Severity.NORMAL)
  @description('Check if there are any duplicated in table with triggered inserts')
  @test
  async 'trigger works only once'() {
    const { supabase, user } = await this.createSignedInSupaClient()

    // insert profile to trigger profile_insert trigger
    const { data: profilesInserted, error: errorInsert } = await this.insertProfile(
      supabase,
      user,
      user
    )
    expect(errorInsert).toBeNull()
    const profileInserted = profilesInserted.pop()
    expect(profileInserted.username).toMatch(user.username)

    // check if there are rows with duplicate username in profile_insert table
    log('Check if there are rows with duplicate username in profile_insert table')
    console.log('asdasdasd')
    const duplicates =
      await Hooks.sql`SELECT username, COUNT(*) FROM profile_inserts GROUP BY username HAVING COUNT(*) > 1`
    console.log('asdasdasd asd')
    expect(duplicates.count).toBe(0)
  }

  @feature('Triggers')
  @severity(Severity.NORMAL)
  @description('Check if supabase internal trigger does not get retriggered after pause/resume')
  @test.skip
  async 'triggers work only once after pause/resume'() {
    // this test is a bad practice, because we don't want to pause/resume project during single test
    // and therefore pause/resume is moved out to separate action
    // but we need to save state between first test run and test run after resume.
    log('Read raw key saved earlier')
    const rawKey = fs.readFileSync('temp/test_key', { encoding: 'utf-8' })

    log('Check if key is matching the reference value saved earlier')
    const matched = await Hooks.sql`
      select decrypted_raw_key = '${Hooks.sql.types.bytea(rawKey)}'
      from pgsodium.decrypted_key
      where name = 'test_key'
    `
    expect(matched.count).toBe(1)
    expect(matched.pop()['?column?']).toBe(true)
  }
}
