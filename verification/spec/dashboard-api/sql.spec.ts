import { suite, test } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import crossFetch from '../../../src/common/timeoutFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Project } from '../../src/types/project'
import { Hooks } from './hooks'

@suite('sql')
class SQL extends Hooks {
  protected static connectionString: string

  static async before(): Promise<void> {
    try {
      await super.before()

      const projectResp = await crossFetch(
        `${SQL.supaPlatformURI}/projects/${process.env.PROJECT_REF}`,
        {
          headers: this.headers,
        }
      )

      const project: Project = await projectResp.json()
      this.connectionString = project.connectionString
      ;(this.headers as Record<string, string>)['x-connection-encrypted'] = this.connectionString
      return Promise.resolve(null)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  @feature(FEATURE.SQL)
  @severity(Severity.NORMAL)
  @description('create new sql query in editor')
  @test
  async 'create content'() {
    const fakeQuery = this.genQuery()

    log('send create content request')
    const contentResp = await crossFetch(
      `${SQL.supaPlatformURI}/projects/${process.env.PROJECT_REF}/content`,
      {
        method: 'POST',
        headers: SQL.headers,
        body: JSON.stringify(fakeQuery),
      },
      10 * 1000
    )

    expect(contentResp.status).toBe(201)
    const [content] = await contentResp.json()
    expect(content.name).toBe(fakeQuery.name)
    expect(content.type).toBe(fakeQuery.type)
    expect(content.visibility).toBe(fakeQuery.visibility)

    log('update content with query')
    const query = 'select count(*) from extensions.pg_stat_statements'
    const contentUpdateResp = await crossFetch(
      `${SQL.supaPlatformURI}/projects/${process.env.PROJECT_REF}/content?id=${content.id}`,
      {
        method: 'PATCH',
        headers: SQL.headers,
        body: JSON.stringify({
          id: content.id,
          type: 'sql',
          content: {
            content_id: content.id,
            favorite: false,
            schema_version: '1.0',
            sql: query,
          },
        }),
      },
      10 * 1000
    )
    expect(contentUpdateResp.status).toBe(200)
    const updContents = await contentUpdateResp.json()
    expect(updContents.length).toBeGreaterThan(0)
    expect(updContents.map((c: any) => c.id)).toContain(content.id)
    const ourContent = updContents.filter((c: any) => c.id === content.id)[0]
    expect(ourContent.content.sql).toBe(query)

    log('get content to check if it was updated')
    const contentGetResp = await crossFetch(
      `${SQL.supaPlatformURI}/projects/${process.env.PROJECT_REF}/content`,
      {
        headers: SQL.headers,
      },
      10 * 1000
    )
    expect(contentGetResp.status).toBe(200)
    const { data: contents } = await contentGetResp.json()
    expect(contents.length).toBeGreaterThan(0)
    expect(contents.map((c: any) => c.id)).toContain(content.id)

    log('validate query')
    const validateResp = await crossFetch(
      `${SQL.supaMetaURI}/${process.env.PROJECT_REF}/query/validate`,
      {
        method: 'POST',
        headers: SQL.headers,
        body: JSON.stringify({
          query: ourContent.content.sql,
        }),
      },
      10 * 1000
    )
    expect(validateResp.status).toBe(201)
    const validate = await validateResp.json()
    expect(validate.valid).toBe(true)

    log('execute query')
    const executeResp = await crossFetch(
      `${SQL.supaMetaURI}/${process.env.PROJECT_REF}/query`,
      {
        method: 'POST',
        headers: SQL.headers,
        body: JSON.stringify({
          query: ourContent.content.sql,
        }),
      },
      10 * 1000
    )
    expect(executeResp.status).toBe(201)
    const execute = await executeResp.json()
    expect(execute.length).toBeGreaterThan(0)
    expect(execute[0].count).toBeGreaterThan(0)

    log('remove query')
    const deleteResp = await crossFetch(
      `${SQL.supaPlatformURI}/projects/${process.env.PROJECT_REF}/content?id=${content.id}`,
      {
        method: 'DELETE',
        headers: SQL.headers,
        body: JSON.stringify({}),
      },
      10 * 1000
    )
    expect(deleteResp.status).toBe(200)
  }

  // steps

  @step('create query request')
  private genQuery() {
    const q = {
      name: faker.internet.userName(),
      description: faker.lorem.sentence(),
      type: 'sql',
      visibility: 'user',
      id: faker.datatype.uuid(),
      content: {
        content_id: '',
        favorite: false,
        schema_version: '1.0',
      },
    }
    attach('create query body', JSON.stringify(q), ContentType.JSON)
    return q
  }
}
