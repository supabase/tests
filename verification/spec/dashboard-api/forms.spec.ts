import { suite, test } from '@testdeck/jest'
import crossFetch from '../../../src/common/retriedFetch'
import { ContentType, Severity } from 'allure-js-commons'

import { attach, description, feature, log, severity, step } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Hooks } from './hooks'
import { TicketsResponse } from '../../src/types/hubspot'

@suite('forms')
class Forms extends Hooks {
  protected static apiKey: string

  @feature(FEATURE.FORMS)
  @severity(Severity.NORMAL)
  @description('get latest exit surveys submissions')
  @test
  async '[skip-stage] exit surveys'() {
    const tickets = await this.searchTickets(this.exitSurveysFilters())
    expect(tickets).toBeDefined()
    expect(tickets).not.toBeNull()
    log('tickets', JSON.stringify(tickets.total))
    expect(tickets.total).toBeGreaterThan(0)
  }

  @feature(FEATURE.FORMS)
  @severity(Severity.NORMAL)
  @description('get latest feedback submissions')
  @test
  async '[skip-stage] feedback submissions'() {
    const tickets = await this.searchTickets(this.feedbackFilters())
    expect(tickets).toBeDefined()
    expect(tickets).not.toBeNull()
    log('tickets', JSON.stringify(tickets.total))
    expect(tickets.total).toBeGreaterThan(0)
  }

  @feature(FEATURE.FORMS)
  @severity(Severity.NORMAL)
  @description('get latest product feedback submissions')
  @test
  async '[skip-stage] product feedback submissions'() {
    const tickets = await this.searchTickets(this.productFeedbackFilters())
    expect(tickets).toBeDefined()
    expect(tickets).not.toBeNull()
    log('tickets', JSON.stringify(tickets.total))
    expect(tickets.total).toBeGreaterThan(0)
  }

  @step('search tickets')
  private async searchTickets(
    filters: { value: string; propertyName: string; operator: string }[]
  ): Promise<TicketsResponse> {
    log('search tickets', JSON.stringify(filters))
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
                filters: filters,
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

  private exitSurveysFilters() {
    // the day before yesterday in YYYY-MM-DD format
    const date = new Date()
    date.setDate(date.getDate() - 2)
    const dateStr = date.toISOString().split('T')[0]

    return [
      {
        value: 'Exit Survey',
        propertyName: 'subject',
        operator: 'CONTAINS_TOKEN',
      },
      {
        value: dateStr,
        propertyName: 'createdate',
        operator: 'GT',
      },
    ]
  }

  private feedbackFilters() {
    const date = new Date()
    date.setDate(date.getDate() - 4)
    const dateStr = date.toISOString().split('T')[0]

    return [
      {
        value: 'true',
        propertyName: 'is_product_feedback',
        operator: 'NEQ',
      },
      {
        value: 'feedback',
        propertyName: 'type',
        operator: 'EQ',
      },
      {
        value: dateStr,
        propertyName: 'createdate',
        operator: 'GT',
      },
    ]
  }

  private productFeedbackFilters() {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    const dateStr = date.toISOString().split('T')[0]

    return [
      {
        value: 'true',
        propertyName: 'is_product_feedback',
        operator: 'EQ',
      },
      {
        value: 'feedback',
        propertyName: 'type',
        operator: 'EQ',
      },
      {
        value: dateStr,
        propertyName: 'createdate',
        operator: 'GT',
      },
    ]
  }
}
