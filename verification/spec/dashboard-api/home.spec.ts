import { suite, test } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import crossFetch from '../../../src/common/timeoutFetch'
import { Severity } from 'allure-js-commons'

import { createClient } from '@supabase/supabase-js'

import { description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { STATUS } from '../../src/enums/status'
import { Project, ProjectResponse } from '../../src/types/project'
import { Hooks } from './hooks'

@suite('home')
class Home extends Hooks {
  @feature(FEATURE.HOME)
  @severity(Severity.BLOCKER)
  @description('get projects list')
  @test
  async 'get projects'() {
    const projectsResp = await crossFetch(`${Home.supaPlatformURI}/projects`, {
      headers: Home.headers,
    })
    expect(projectsResp.status).toBe(200)

    const projects = await projectsResp.json()
    expect(projects).toBeDefined()
    expect(projects.length).toBeGreaterThan(0)
    expect(projects.map((p: any) => p.name)).toContain('verifytests')
  }

  @feature(FEATURE.HOME)
  @severity(Severity.BLOCKER)
  @description('get organizations list')
  @test
  async 'get organizations'() {
    const orgsResp = await crossFetch(`${Home.supaPlatformURI}/organizations`, {
      headers: Home.headers,
    })
    expect(orgsResp.status).toBe(200)

    const orgs = await orgsResp.json()
    expect(orgs).toBeDefined()
    expect(orgs.length).toBeGreaterThan(0)
    expect(orgs.map((o: any) => o.name)).toContain('verification')
  }

  @feature(FEATURE.HOME)
  @severity(Severity.BLOCKER)
  @description('get project settings')
  @test
  async 'get project settings'() {
    // get project from api
    const projectResp = await crossFetch(
      `${Home.supaPlatformURI}/props/project/${process.env.PROJECT_REF}/settings`,
      {
        headers: Home.headers,
      }
    )

    // check project fields returned
    expect(projectResp.status).toBe(200)
    const project: ProjectResponse = await projectResp.json()
    expect(project).toBeDefined()
    expect(project.project.ref).toBe(process.env.PROJECT_REF)
    expect(project.project.name).toBe(process.env.PROJECT_NAME)
    expect(project.project.status).toBe(STATUS.ACTIVE_HEALTHY)
  }

  @feature(FEATURE.HOME)
  @severity(Severity.BLOCKER)
  @description('get project')
  @test
  async 'get project'() {
    const projectResp = await crossFetch(
      `${Home.supaPlatformURI}/projects/${process.env.PROJECT_REF}`,
      {
        headers: Home.headers,
      }
    )
    expect(projectResp.status).toBe(200)

    const project: Project = await projectResp.json()
    expect(project).toBeDefined()
    expect(project.ref).toBe(process.env.PROJECT_REF)
    expect(project.name).toBe(process.env.PROJECT_NAME)
    expect(project.status).toBe(STATUS.ACTIVE_HEALTHY)
    expect(project.connectionString.length).toBeGreaterThan(0)
    expect(project.restUrl).toBe(
      `https://${process.env.PROJECT_REF}.${Home.projectDomain}/rest/v1/`
    )
    expect(project.db_host).toBe(`db.${process.env.PROJECT_REF}.${Home.projectDomain}`)
    expect(project.subscription_id.length).toBeGreaterThan(0)
  }

  @feature(FEATURE.HOME)
  @severity(Severity.BLOCKER)
  @description('check supabase clients works correctly')
  @test
  async 'supabase auth is working in project'() {
    const projectResp = await crossFetch(
      `${Home.supaPlatformURI}/props/project/${process.env.PROJECT_REF}/settings`,
      {
        headers: Home.headers,
      }
    )
    const project: ProjectResponse = await projectResp.json()

    // access project using returned api key, check it is healthy
    const sb = createClient(
      `https://${process.env.PROJECT_REF}.${Home.projectDomain}`,
      this.getApiKey(project, 'anon')
    )
    const fakeUser = {
      email: faker.internet.exampleEmail(),
      password: faker.internet.password(),
    }
    const { user, error: errorSignUp } = await sb.auth.signUp(fakeUser)
    expect(errorSignUp).toBeNull()
    expect(user?.email).toBe(fakeUser.email.toLowerCase())

    // check admin rights
    const sbAdmin = createClient(
      `https://${process.env.PROJECT_REF}.${Home.projectDomain}`,
      this.getApiKey(project, 'service_role')
    )
    const { error } = await sbAdmin.auth.api.deleteUser(user.id)
    expect(error).toBeNull()

    const { data: users } = await sbAdmin.auth.api.listUsers()
    expect(users.map((u) => u.email)).not.toContain(user.email)
  }

  // steps

  @step('Get api key')
  private getApiKey(project: ProjectResponse, tags: string): string {
    return (
      project.services
        .filter((s: any) => s.name === 'Default API')[0]
        ?.service_api_keys?.filter((s) => s.tags === tags)[0]?.api_key ?? ''
    )
  }
}
