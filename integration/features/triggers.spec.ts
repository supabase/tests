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
    // check out supabase/migrartions/20230104141145_data.sql to see profile_insert trigger
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
}
