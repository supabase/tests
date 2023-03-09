import { suite, test } from '@testdeck/jest'
import crossFetch from '../../../src/common/timeoutFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Hooks } from './hooks'

@suite('api')
class API extends Hooks {
  protected static apiKey: string

  static async before(): Promise<void> {
    try {
      await super.before()

      this.apiKey = await API.getProjectApiKey(process.env.PROJECT_REF, 'service_role')
      return Promise.resolve(null)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  @feature(FEATURE.API)
  @severity(Severity.NORMAL)
  @description('get api service and project info')
  @test
  async 'get api service'() {
    const apiResp = await crossFetch(
      `${API.supaPlatformURI}/props/project/${process.env.PROJECT_REF}/api`,
      {
        headers: API.headers,
      }
    )
    expect(apiResp.status).toBe(200)

    const api = await apiResp.json()
    this.expectAutoApiServiceIsCorrect(api.autoApiService)
  }

  // steps

  @step('expect project is correctly returned')
  private expectProjectIsCorrect(project: any) {
    attach('project', JSON.stringify(project), ContentType.JSON)
    expect(project.db_host).toBe(`db.${process.env.PROJECT_REF}.${API.projectDomain}`)
    expect(project.db_name).toBe('postgres')
    expect(project.db_port).toBe(5432)
    expect(project.db_schema).toContain('public, storage, graphql_public')
    expect(project.name).toBe(process.env.PROJECT_NAME)
    expect(project.ref).toBe(process.env.PROJECT_REF)
  }

  @step('expect autoApiService is correctly returned')
  private expectAutoApiServiceIsCorrect(autoApiService: any) {
    autoApiService.defaultApiKey = autoApiService.defaultApiKey.substring(
      autoApiService.defaultApiKey.length - 10
    )
    autoApiService.serviceApiKey = autoApiService.serviceApiKey.substring(
      autoApiService.serviceApiKey.length - 10
    )

    attach('autoApiService', JSON.stringify(autoApiService), ContentType.JSON)
    expect([
      {
        id: 1,
        name: 'Auto API',
      },
      {
        id: 1,
        name: 'Instant API',
      },
    ]).toContainEqual(autoApiService.app)
    expect(autoApiService.app_config).toHaveProperty('db_schema', 'public')
    expect(autoApiService.app_config).toHaveProperty(
      'endpoint',
      `${process.env.PROJECT_REF}.${API.projectDomain}`
    )
    expect(autoApiService.endpoint).toBe(`${process.env.PROJECT_REF}.${API.projectDomain}`)
    expect(autoApiService.name).toBe('Default API')
    expect(autoApiService.project).toStrictEqual({
      ref: process.env.PROJECT_REF,
    })
    expect(autoApiService.restUrl).toBe(
      `https://${process.env.PROJECT_REF}.${API.projectDomain}/rest/v1/`
    )
  }
}
