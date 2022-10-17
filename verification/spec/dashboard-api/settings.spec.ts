import { suite, test } from '@testdeck/jest'
import crossFetch from '../../../src/common/timeoutFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Hooks } from './hooks'

@suite('settings')
class Settings extends Hooks {
  protected static apiKey: string

  static async before(): Promise<void> {
    try {
      await super.before()

      this.apiKey = await Settings.getProjectApiKey(process.env.PROJECT_REF, 'service_role')
      return Promise.resolve(null)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  @feature(FEATURE.SETTINGS)
  @severity(Severity.NORMAL)
  @description('get api service (postgrest) settings list')
  @test
  async 'get postgrest settings'() {
    const settingsResp = await crossFetch(
      `${Settings.supaPlatformURI}/projects/${process.env.PROJECT_REF}/config?app=postgrest`,
      {
        headers: Settings.headers,
      }
    )
    expect(settingsResp.status).toBe(200)

    const settings = await settingsResp.json()
    this.expectPostgrestSettingsCorrect(settings)
  }

  // steps

  @step('expect project is correctly returned')
  private expectPostgrestSettingsCorrect(settings: any) {
    attach('settings', JSON.stringify(settings), ContentType.JSON)
    expect(settings.db_anon_role).toBe('anon')
    expect(settings.db_extra_search_path).toContain('public, extensions')
    expect(settings.db_schema).toContain('public, storage, graphql_public')
    expect(settings.jwt_secret).toBeDefined()
    expect(settings.max_rows).toBe(1000)
    expect(settings.role_claim_key).toBe('.role')
  }
}
