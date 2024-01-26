import { suite, test, timeout } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import crossFetch from '../../../src/common/retriedFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Hooks } from './hooks'
import { Response } from 'playwright'
import { Ticket, TicketsResponse } from '../../src/types/hubspot'

@suite('[gui] support forms')
class Forms extends Hooks {
  @feature(FEATURE.FORMS)
  @severity(Severity.NORMAL)
  @description('create support request from project page')
  @timeout(600000)
  @test
  async '[skip-stage] new ticket from project'() {
    const page = await this.browserCtx.newPage()
    await page.goto(`${process.env.SUPA_DASHBOARD}/project/${process.env.PROJECT_REF}`)
    attach('project home page', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.waitForLoadState('networkidle', { timeout: 60000 })
    await page.locator(`h1:has-text("${process.env.PROJECT_NAME}")`).isVisible()

    if (await page.locator('button:has-text("Accept")').first().isVisible()) {
      await page.locator('button:has-text("Accept")').first().click({ delay: 100 })
    }

    await page.locator('#help-popover-button').first().isVisible()
    try {
      await page.locator('#help-popover-button').first().click({ delay: 100 })
    } catch (e) {
      // retry
      await page.locator('#help-popover-button').first().click({ delay: 100 })
    }
    await page.locator('a:has-text("Contact Support")').first().click({ delay: 100 })

    attach('support form', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.locator('h3:has-text("How can we help?")').isVisible()
    await page.locator(`button:has-text("${process.env.PROJECT_NAME}")`).isVisible()

    // fill form
    await page.fill('input[id="subject"]', 'From verification test')
    await page.click('button[id="category"]', { delay: 100 })
    await page.click('div[role="menuitem"]:has-text("Database unresponsive")', { delay: 100 })
    await page.hover('div:has-text("No particular service")', { timeout: 1000 })
    await page.waitForTimeout(200)
    await page.getByText('No particular service').locator('..').click({ delay: 100 })
    // await page.click('div:has-text("No particular service")', { delay: 100 })
    await page.waitForTimeout(200)
    await page.click('p:has-text("Authentication")', { delay: 100 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape', { delay: 100 })
    const message = faker.lorem.paragraph()
    await page.fill('textarea[id="message"]', message)

    if (await page.locator('button:has-text("Accept")').first().isVisible()) {
      await page.locator('button:has-text("Accept")').first().click({ delay: 100 })
    }

    attach('form filled', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    const [response] = await Promise.all([
      page.waitForResponse(/\/platform\/feedback\/send/, { timeout: 60000 }),
      page.click('button[type="submit"]:has-text("Send support request")'),
    ])
    expect(response.status()).toBe(201)
    await this.checkSupportForm(response, message)

    await page.locator('h3:has-text("Support request successfully sent!")').isVisible()
    attach('request was submitted', await page.screenshot({ fullPage: true }), ContentType.JPEG)
    await page.click('button:has-text("Go back")')

    await page.locator('button:has-text("New project")').first().isVisible()

    const ticketsResp = await this.searchTickets()

    log('check if ticket was created and found')
    expect(ticketsResp).not.toBeNull()

    const ticket = ticketsResp.results.find(
      (ticket) => ticket.properties.subject === 'From verification test'
    )
    expect(ticket).not.toBeNull()
    await crossFetch(
      `https://api.hubapi.com/crm/v3/objects/tickets/${ticket.id}`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
        },
      },
      5000,
      3,
      3000
    )
    this.checkSupportTicket(ticket, message)
  }

  @feature(FEATURE.FORMS)
  @severity(Severity.NORMAL)
  @description('create request to contact enterprise sales')
  @timeout(90000)
  @test.skip
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

  private async checkSupportForm(response: Response, message: string) {
    const data = await response.request().postDataJSON()
    expect(data.subject).toBe('From verification test')
    expect(data.message).toBe(message)
    expect(data.category).toBe('Database_unresponsive')
    expect(data.affectedServices).toContain('authentication')
    expect(data.projectRef).toBe(process.env.PROJECT_REF)
    expect(data.severity).toBe('Low')
  }
  private async checkSupportTicket(ticket: Ticket, message: string) {
    expect(ticket.properties.subject).toBe('From verification test')
    expect(ticket.properties.content).toBe(message)
    expect(ticket.properties.type).toBe('database_unresponsive')
    expect(ticket.properties.affected_services).toContain('authentication')
    expect(ticket.properties.project_reference).toBe(process.env.PROJECT_REF)
    expect(ticket.properties.severity).toBe('low')
    expect(ticket.properties.email).toBe('romanov@testrat.dev')
    expect(ticket.properties.organization_slug).toBe('squealing-ivory-qshl8px')
    expect(ticket.properties.project_tier).toBe('free')
    expect(ticket.properties.site_url).toBe('http://localhost:3000')
    expect(ticket.properties.ticket_priority).toBe('low')
    expect(ticket.properties.verified).toBe('true')
  }

  private async searchTickets(): Promise<TicketsResponse> {
    for (let i = 1; i <= 30; i++) {
      const ticketsResp = await crossFetch(
        'https://api.hubapi.com/crm/v3/objects/tickets/search',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    value: 'romanov@testrat.dev',
                    propertyName: 'email',
                    operator: 'EQ',
                  },
                ],
              },
            ],
            sorts: [
              {
                propertyName: 'createdate',
                direction: 'DESCENDING',
              },
            ],
            properties: [
              'email',
              'affected_services',
              'allow_support_access',
              'library',
              'content',
              'organization_slug',
              'project_reference',
              'ticket_priority',
              'severity',
              'additional_redirect_urls',
              'site_url',
              'subject',
              'tags',
              'verified',
              'createdate',
              'firstname',
              'lastname',
              'project_tier',
              'type',
            ],
            limit: 5,
            after: 0,
          }),
        },
        10000,
        3,
        3000
      )
      if (ticketsResp.status !== 200) {
        continue
      }
      const tickets = (await ticketsResp.json()) as TicketsResponse
      if (tickets.total !== 0) {
        return tickets
      }
      await new Promise((resolve) => setTimeout(resolve, 3000 * i))
    }
    return null
  }
}
