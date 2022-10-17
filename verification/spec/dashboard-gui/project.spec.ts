import { suite, test, timeout } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import crossFetch from '../../../src/common/timeoutFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { STATUS } from '../../src/enums/status'
import { Hooks } from './hooks'

@suite('[gui] project')
class Project extends Hooks {
  @feature(FEATURE.SETTINGS)
  @severity(Severity.NORMAL)
  @description('create new project using gui dashboard')
  @timeout(300000)
  @test
  async 'create project'() {
    const page = await this.browserCtx.newPage()
    await page.goto(process.env.SUPA_DASHBOARD)

    attach('home page', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.locator('button:has-text("New project")').first().click()
    attach('create project', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.locator('[role="menuitem"] >> text=verification').click()

    const name = faker.word.noun()
    const pass = faker.internet.password()
    await page.fill('input[id="project-name"]', name)
    await page.fill('input[id="password"]', pass)
    attach('form filled', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.click('button:has-text("Create new project")')

    await page.waitForSelector(`h1:has-text("${name}")`)
    await page.waitForSelector(`"Setting up project"`)
    attach('project setting up', await page.screenshot({ fullPage: true }), ContentType.JPEG)

    const pageURLParts = page.url().split('/')
    const isBuilding = pageURLParts.pop()
    const ref = pageURLParts.pop()
    expect(isBuilding).toBe('building')

    await page.close()
    for (let i = 0; i < 60; i++) {
      try {
        const statusResp = await crossFetch(`${Project.SupaPlatformURI}/projects/${ref}/status`, {
          headers: Project.headers,
        })
        expect(statusResp.status).toBe(200)
        const { status } = await statusResp.json()
        expect(status).toBe(STATUS.ACTIVE_HEALTHY)
        break
      } catch {
        await page.waitForTimeout(3000)
      }
    }

    const statusResp = await crossFetch(
      `${Project.SupaPlatformURI}/projects/${ref}/status`,
      {
        headers: Project.headers,
      },
      10000
    )
    expect(statusResp.status).toBe(200)
    const { status } = await statusResp.json()
    expect(status).toBe(STATUS.ACTIVE_HEALTHY)

    const deleteResp = await crossFetch(
      `${Project.SupaPlatformURI}/projects/${ref}`,
      {
        method: 'DELETE',
        headers: Project.headers,
      },
      15000
    )
    expect(deleteResp.status).toBe(200)
    const del = await deleteResp.json()
    expect(del.name).toBe(name)
    expect(del.ref).toBe(ref)
  }
}
