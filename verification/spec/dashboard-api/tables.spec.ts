import { suite, test } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import crossFetch from '../../../src/common/retriedFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Table, TableDTO } from '../../src/types/table'
import { defaultSchemas, defaultTables } from '../../src/constants'
import { Schema } from '../../src/types/schema'
import { Project } from '../../src/types/project'
import dbtypes from '../../src/generators/dbtypes'
import { Hooks } from './hooks'

@suite('tables')
class Tables extends Hooks {
  protected static connectionString: string

  static async before(): Promise<void> {
    try {
      await super.before()

      const projectResp = await crossFetch(
        `${Tables.supaPlatformURI}/projects/${process.env.PROJECT_REF}`,
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

  @feature(FEATURE.TABLES)
  @severity(Severity.NORMAL)
  @description('get tables list')
  @test
  async 'get tables'() {
    const tablesResp = await crossFetch(
      `${Tables.supaMetaURI}/${process.env.PROJECT_REF}/tables`,
      {
        headers: Tables.headers,
      },
      20000
    )
    expect(tablesResp.status).toBe(200)

    const tables: Table[] = await tablesResp.json()

    expect(tables).toBeDefined()

    expect(tables.length).toBeGreaterThan(0)
    expect(
      tables.map((t) => {
        return {
          name: t.name,
          schema: t.schema,
        }
      })
    ).toEqual(expect.arrayContaining(defaultTables))
  }

  @feature(FEATURE.TABLES)
  @severity(Severity.NORMAL)
  @description('get schemas list')
  @test
  async 'get schemas'() {
    const schemasResp = await crossFetch(
      `${Tables.supaMetaURI}/${process.env.PROJECT_REF}/schemas`,
      {
        headers: Tables.headers,
      }
    )
    expect(schemasResp.status).toBe(200)

    const schemas: Schema[] = await schemasResp.json()

    expect(schemas).toBeDefined()

    expect(schemas.length).toBeGreaterThan(0)
    expect(
      schemas.map((t) => {
        return {
          name: t.name,
          owner: t.owner,
        }
      })
    ).toEqual(expect.arrayContaining(defaultSchemas))
  }

  @feature(FEATURE.TABLES)
  @severity(Severity.NORMAL)
  @description('create table via dashboard API')
  @test
  async 'add table'() {
    const table = this.dummyTable()
    const tablesResp = await crossFetch(`${Tables.supaMetaURI}/${process.env.PROJECT_REF}/tables`, {
      method: 'POST',
      headers: this.headerWithID(),
      body: JSON.stringify({
        name: table.name,
        comment: table.comment,
      }),
    })
    expect(tablesResp.status).toBe(201)

    const { id, name, comment } = await tablesResp.json()
    expect(id).toBeDefined()
    expect(name).toBe(table.name)
    expect(comment).toBe(table.comment)

    for (const col of table.cols) {
      col.tableId = id
      const colResp = await crossFetch(`${Tables.supaMetaURI}/${process.env.PROJECT_REF}/columns`, {
        method: 'POST',
        headers: this.headerWithID(),
        body: JSON.stringify(col),
      })
      expect(colResp.status).toBe(201)
    }

    const queryResp = await crossFetch(`${Tables.supaMetaURI}/${process.env.PROJECT_REF}/query`, {
      method: 'POST',
      headers: this.headerWithID(),
      body: JSON.stringify({
        query: `ALTER TABLE \"public\".\"${table.name}\" ADD PRIMARY KEY (\"solid_id\")`,
      }),
    })
    expect(queryResp.status).toBe(201)

    const tableResp = await crossFetch(
      `${Tables.supaMetaURI}/${process.env.PROJECT_REF}/tables?id=${id}`,
      {
        headers: this.headerWithID(),
      }
    )
    expect(tableResp.status).toBe(200)
    const createdTable = await tableResp.json()
    this.expectTablesEqual(createdTable, table, id)

    const deleteResp = await crossFetch(
      `${Tables.supaMetaURI}/${process.env.PROJECT_REF}/tables?id=${id}`,
      {
        method: 'DELETE',
        headers: this.headerWithID(),
      }
    )
    expect(deleteResp.status).toBe(200)
  }

  @feature(FEATURE.DATABASE)
  @severity(Severity.NORMAL)
  @description('get roles list')
  @test
  async 'get roles'() {
    const rolesResp = await crossFetch(`${Tables.supaMetaURI}/${process.env.PROJECT_REF}/roles`, {
      headers: Tables.headers,
    })
    expect(rolesResp.status).toBe(200)

    const roles = await rolesResp.json()

    expect(roles).toBeDefined()

    expect(roles.length).toBeGreaterThan(0)
    expect(roles.map((t: any) => t.name)).toEqual(
      expect.arrayContaining([
        'postgres',
        'supabase_admin',
        'anon',
        'authenticated',
        'authenticator',
        'supabase_auth_admin',
        'supabase_storage_admin',
        'dashboard_user',
        'service_role',
        'pgbouncer',
      ])
    )
  }

  @feature(FEATURE.DATABASE)
  @severity(Severity.NORMAL)
  @description('get triggers list')
  @test
  async 'get triggers'() {
    const triggersResp = await crossFetch(
      `${Tables.supaMetaURI}/${process.env.PROJECT_REF}/triggers`,
      {
        headers: Tables.headers,
      }
    )
    expect(triggersResp.status).toBe(200)

    const triggers = await triggersResp.json()

    expect(triggers).toBeDefined()

    expect(triggers.length).toBeGreaterThan(0)
    expect(triggers.map((t: any) => t.name)).toEqual(
      expect.arrayContaining(['update_objects_updated_at'])
    )
  }

  @feature(FEATURE.DATABASE)
  @severity(Severity.NORMAL)
  @description('get extensions list')
  @test
  async 'get extensions'() {
    const extensionsResp = await crossFetch(
      `${Tables.supaMetaURI}/${process.env.PROJECT_REF}/extensions`,
      {
        headers: Tables.headers,
      }
    )
    expect(extensionsResp.ok).toBe(true)

    const extensions = await extensionsResp.json()

    expect(extensions).toBeDefined()

    expect(extensions.length).toBeGreaterThan(0)
    expect(extensions.map((t: any) => t.name)).toEqual(
      expect.arrayContaining([
        'postgis_tiger_geocoder',
        'intarray',
        'uuid-ossp',
        'lo',
        'pg_stat_statements',
        'plpgsql_check',
        'plpgsql',
        'http',
        'pg_net',
        'pgjwt',
        'hstore',
        'pgcrypto',
        'pg_graphql',
        'supautils',
        'pgsodium',
      ])
    )
  }

  @feature(FEATURE.DATABASE)
  @severity(Severity.NORMAL)
  @description('get publications list')
  @test
  async 'get publications'() {
    const publicationsResp = await crossFetch(
      `${Tables.supaMetaURI}/${process.env.PROJECT_REF}/publications`,
      {
        headers: Tables.headers,
      }
    )
    expect(publicationsResp.ok).toBe(true)

    const publications = await publicationsResp.json()

    expect(publications).toBeDefined()

    expect(publications.length).toBeGreaterThan(0)
    expect(publications.map((t: any) => t.name)).toEqual(
      expect.arrayContaining(['supabase_realtime'])
    )
  }

  // steps

  @step('compare table models to be equal')
  private expectTablesEqual(actualTable: any, expectedTable: TableDTO, id: any) {
    expect(actualTable.name).toBe(expectedTable.name)
    expect(actualTable.comment).toBe(expectedTable.comment)
    expect(actualTable.schema).toBe('public')
    expect(actualTable.primary_keys.length).toBe(1)
    expect(actualTable.primary_keys[0]).toStrictEqual({
      schema: 'public',
      table_name: expectedTable.name,
      name: 'solid_id',
      table_id: id,
    })
    for (let ctr = 0; ctr < actualTable.columns.length; ctr++) {
      const actual = actualTable.columns[ctr]
      const expected = expectedTable.cols.filter((c) => c.name === actual.name)[0]
      expect(actual.table_id).toBe(id)
      expect(actual.name).toBe(expected.name)
      expect(actual.format).toBe(expected.type)
      expect(actual.comment).toBe(expected.comment)
      expect(actual.is_nullable).toBe(expected.isNullable ?? false)
      expect(actual.is_unique).toBe(expected.isUnique ?? false)
      expect(actual.is_identity).toBe(expected.isIdentity ?? false)
      expect(actual.schema).toBe('public')
      expect(actual.table).toBe(expectedTable.name)
      expect(actual.default_value?.toLowerCase()).toBe(expected.defaultValue?.toLowerCase())
    }
  }

  @step('create dummy table')
  private dummyTable(): TableDTO {
    const table: TableDTO = {
      name: faker.random.word() + 's',
      comment: faker.lorem.sentence(),
      cols: [
        {
          name: 'solid_id',
          type: 'int8',
          comment: null,
          isIdentity: true,
          isPrimaryKey: false,
          isUnique: false,
          tableId: 0,
        },
        {
          name: 'solid_created_at',
          type: 'timestamptz',
          defaultValue: 'NOW()',
          defaultValueFormat: 'expression',
          comment: null,
          isIdentity: false,
          isNullable: true,
          isPrimaryKey: false,
          isUnique: false,
        },
        {
          name: faker.unique(faker.database.column),
          type: faker.helpers.arrayElement(dbtypes),
          comment: faker.lorem.sentence(5),
          isIdentity: false,
          isNullable: true,
          isPrimaryKey: false,
          isUnique: false,
        },
        {
          name: faker.unique(faker.database.column),
          type: faker.helpers.arrayElement(dbtypes),
          comment: null,
          isIdentity: false,
          isNullable: true,
          isPrimaryKey: false,
          isUnique: false,
        },
        {
          name: faker.unique(faker.database.column),
          type: faker.helpers.arrayElement(dbtypes),
          comment: faker.lorem.sentence(),
          isIdentity: false,
          isNullable: true,
          isPrimaryKey: false,
          isUnique: false,
        },
      ],
    }
    attach('dummy table', JSON.stringify(table), ContentType.JSON)
    return table
  }

  private headerWithID() {
    const headers: Record<string, string> = {}
    for (const [key, val] of Object.entries(Tables.headers)) {
      headers[key] = val
    }
    headers['x-request-id'] = faker.datatype.uuid()
    return headers
  }
}
