import fs from 'fs'

import { suite, test, timeout } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import { Severity } from 'allure-js-commons'

import { FEATURE } from '../types/enums'
import { description, feature, log, severity, step } from '../.jest/jest-custom-reporter'
import { Hooks } from './hooks'

@suite('triggers')
class Triggers extends Hooks {
  @feature(FEATURE.TRIGGERS)
  @severity(Severity.NORMAL)
  @description('Insert user profile to trigger the a according trigger')
  @test
  async 'trigger works'() {
    const { supabase, user } = await this.createSignedInSupaClient()

    // insert profile to trigger profile_insert trigger
    const {
      data: [profileInserted],
      error: errorInsert,
    } = await this.insertProfile(supabase, user, user)
    expect(errorInsert).toBeNull()
    expect(profileInserted.username).toMatch(user.username)

    // check that profile_insert trigger has been executed
    const event = await supabase
      .from('profile_inserts')
      .select('*')
      .eq('user_id', profileInserted.id)

    expect(event.data.length).toBe(1)
  }

  @feature(FEATURE.TRIGGERS)
  @severity(Severity.NORMAL)
  @description('Check if there are any duplicated in table with triggered inserts')
  @test
  async 'trigger works only once'() {
    const { supabase, user } = await this.createSignedInSupaClient()

    // insert profile to trigger profile_insert trigger
    const {
      data: [profileInserted],
      error: errorInsert,
    } = await this.insertProfile(supabase, user, user)
    expect(errorInsert).toBeNull()
    expect(profileInserted.username).toMatch(user.username)

    // check if there are rows with duplicate username in profile_insert table
    log('Check if there are rows with duplicate username in profile_insert table')
    const duplicates =
      await Hooks.sql`SELECT username, COUNT(*) FROM profile_inserts GROUP BY username HAVING COUNT(*) > 1`
    expect(duplicates.count).toBe(0)
  }

  @feature(FEATURE.TRIGGERS)
  @severity(Severity.NORMAL)
  @description('Check if supabase internal trigger does not get retriggered after pause/resume')
  @test
  async 'triggers work only once after pause/resume'() {
    // this test is a bad practice, because we don't want to pause/resume project during single test
    // and therefore pause/resume is moved out to separate action
    // but we need to save state between first test run and test run after resume.
    let raw_key: string
    if (fs.existsSync('test_key')) {
      log('Read raw key saved earlier')
      raw_key = fs.readFileSync('test_key', { encoding: 'utf-8' })
    } else {
      // create pgsodium key to have a reference value
      log('Create pgsodium key to have a reference value')
      raw_key = faker.datatype.uuid()
      await Hooks.sql`
        select * 
        from pgsodium.create_key(name:='test_key', raw_key:='${raw_key}'::bytea);
      `

      // save raw_key to file
      log('Save raw key to file')
      fs.writeFileSync('test_key', raw_key, { encoding: 'utf-8' })
    }

    log('Check if key is matching the reference value saved earlier')
    const matched = await Hooks.sql`
      select decrypted_raw_key = '${raw_key}'
      from pgsodium.decrypted_key
      where name = 'test_key'
    `
    expect(matched.count).toBe(1)
    expect(matched.at(0)).toBe(true)
  }
}
