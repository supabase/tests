import { suite, test } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import crossFetch from '../../../src/common/timeoutFetch'
import { Severity } from 'allure-js-commons'

import { createClient } from '@supabase/supabase-js'

import { description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Hooks } from './hooks'
import { Project } from '../../src/types/project'

@suite('users')
class Users extends Hooks {
  protected static connectionString: string

  static async before(): Promise<void> {
    try {
      await super.before()

      const projectResp = await crossFetch(
        `${Users.supaPlatformURI}/projects/${process.env.PROJECT_REF}`,
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

  @feature(FEATURE.USERS)
  @severity(Severity.NORMAL)
  @description('invite new user via dashboard api')
  @test
  async '[skip-stage] invite user'() {
    const fakeUser = {
      email: faker.internet.exampleEmail(),
    }
    const inviteResp = await crossFetch(
      `${Users.supaPlatformURI}/auth/${process.env.PROJECT_REF}/invite`,
      {
        method: 'POST',
        body: JSON.stringify(fakeUser),
        headers: Users.headers,
      },
      10 * 1000
    )
    expect(inviteResp.status).toBe(201)

    const invite = await inviteResp.json()

    expect(invite).toBeDefined()
    expect(invite.email).toBe(fakeUser.email.toLowerCase())
    expect(invite.aud).toBe('authenticated')
    expect(invite.role).toBe('authenticated')

    const sbAdmin = createClient(
      `https://${process.env.PROJECT_REF}.${Users.projectDomain}`,
      await Users.getProjectApiKey(process.env.PROJECT_REF, 'service_role')
    )
    const { data: users } = await sbAdmin.auth.api.listUsers()
    expect(users.map((u) => u.email)).toContain(fakeUser.email.toLowerCase())
    await sbAdmin.auth.api.deleteUser(invite.id)
  }
}
