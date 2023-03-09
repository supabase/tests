import { suite, test, timeout } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import crossFetch from '../../../src/common/timeoutFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Hooks } from './hooks'
import { Response } from 'playwright'

@suite('[gui] support forms')
class Forms extends Hooks {
  @feature(FEATURE.FORMS)
  @severity(Severity.NORMAL)
  @description('create support request from project page')
  @timeout(60000)
  @test
  async 'new ticket from project'() {
    const page = await this.browserCtx.newPage()
    await page.goto(`${process.env.SUPA_DASHBOARD}/project/${process.env.PROJECT_REF}`)
    attach('project home page', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.locator(`h1:has-text("${process.env.PROJECT_NAME}")`).isVisible()

    await page.locator('button:has-text("Help")').first().click()
    await page.locator('a:has-text("Contact Support")').first().click()

    attach('support form', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.locator('h3:has-text("How can we help?")').isVisible()
    await page.locator(`button:has-text("${process.env.PROJECT_NAME}")`).isVisible()

    // fill form
    await page.fill('input[id="subject"]', 'From verification test')
    await page.click('button[id="category"]', { delay: 100 })
    await page.click('div[role="menuitem"]:has-text("Database unresponsive")', { delay: 100 })
    await page.click('button:has-text("No particular service")', { delay: 100 })
    await page.click('p:has-text("Edge Functions")', { delay: 100 })
    await page.click('p:has-text("Authentication")', { delay: 100 })
    await page.keyboard.press('Escape', { delay: 100 })
    const message = faker.lorem.paragraph()
    await page.fill('textarea[id="message"]', message)

    attach('form filled', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    const [response] = await Promise.all([
      page.waitForResponse(/\/platform\/feedback\/send/),
      page.click('button[type="submit"]:has-text("Send support request")'),
    ])
    expect(response.status()).toBe(201)
    await this.checkSupportFrom(response, message)

    await page.locator('h3:has-text("Support request successfully sent!")').isVisible()
    attach('request was submitted', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.click('button:has-text("Go back to dashboard")')

    await page.locator('button:has-text("New project")').first().isVisible()
  }

  @feature(FEATURE.FORMS)
  @severity(Severity.NORMAL)
  @description('create request to contact enterprise sales')
  @timeout(60000)
  @test
  async 'contact enterprise sales'() {
    const page = await this.browserCtx.newPage()
    await page.goto('https://forms.supabase.com/enterprise')
    await page.locator('h3:has-text("Contact Enterprise Sales")').isVisible()
    attach('enterprise from', await page.screenshot({ fullPage: true }), ContentType.JPEG)

    // fill form
    await page.fill('input[name="company"]', 'verification_tests')
    const firstName = faker.name.firstName()
    await page.fill('input[name="firstname"]', firstName)
    const lastName = faker.name.lastName()
    await page.fill('input[name="lastname"]', lastName)
    await page.fill('input[name="email"]', 'romanov@testrat.dev')
    const phone = faker.phone.phoneNumber('+374 55 ## ## ##')
    await page.fill('input[name="phone"]', phone)
    await page.selectOption('select[name="company_size_dropdown"]', '11-50')
    await page.selectOption('select[name="country_timezone"]', 'Armenia')
    await page.fill(
      'textarea[name="form_note"]',
      'Please ignore this request, it was created by automated tests'
    )

    attach('form filled', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    const [response] = await Promise.all([
      page.waitForResponse(/\/submissions/),
      await page.click('input[type="submit"]'),
    ])

    expect(response.status()).toBe(200)
    await this.checkEnterpriseForm(response, firstName, lastName, phone)

    await page.locator('div:has-text("Thanks for submitting the form.")').first().isVisible()
    attach('request was submitted', await page.screenshot({ fullPage: true }), ContentType.JPEG)
  }

  private async checkEnterpriseForm(
    response: Response,
    firstName: string,
    lastName: string,
    phone: string
  ) {
    const data = await response.request().postData()
    console.log(data)
    expect(data).toContain('verification_tests')
    expect(data).toContain(firstName)
    expect(data).toContain(lastName)
    expect(data).toContain('romanov@testrat.dev')
    expect(data).toContain(phone.replace(/ /g, ''))
    expect(data).toContain('11-50')
    expect(data).toContain('Armenia')
    expect(data).toContain('Please ignore this request, it was created by automated tests')
  }

  private async checkSupportFrom(response: Response, message: string) {
    const data = await response.request().postDataJSON()
    expect(data.subject).toBe('From verification test')
    expect(data.message).toBe(message)
    expect(data.category).toBe('Database_unresponsive')
    expect(data.affectedServices).toContain('edge_functions')
    expect(data.affectedServices).toContain('authentication')
    expect(data.projectRef).toBe(process.env.PROJECT_REF)
    expect(data.severity).toBe('Low')
  }
}
