import { expect } from '@playwright/test'
import { test } from '../../src/execution/persistent-ctx'

const dashboardUrl = process.env.SUPA_DASHBOARD || 'https://app.supabase.com'
const projectId = process.env.FE_TESTS_PROJECT_REF || 'aaaaaaaaaaaaaaaaaaaa'
const editorUrl = `${dashboardUrl}/project/${projectId}/editor`

const actorInfoViewId = process.env.FE_TESTS_ACTOR_INFO_VIEW_ID || '0'
const actorInfoViewUrl = `${editorUrl}/${actorInfoViewId}`

test('insert not available on view', async ({ page }) => {
  await page.goto(actorInfoViewUrl)

  // Expect a insert button to not be visible after table is loaded
  await expect(page.getByRole('columnheader').first()).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('"Insert"')).not.toBeVisible()
})

// todo: remove fixme when docs become available
test.fixme('API docs are available on view', async ({ page }) => {
  await page.goto(actorInfoViewUrl)

  // Expect an API button to not be visible after table is loaded
  await expect(page.getByRole('columnheader').first()).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('API')).toBeVisible()

  await page.click('"API"')
  await expect(page.getByText('header').getByText('API')).toBeVisible()
})

test('open view definition', async ({ page }) => {
  await page.goto(actorInfoViewUrl)

  // Expect an API button to not be visible after table is loaded
  await expect(page.getByRole('columnheader').first()).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Definition')).toBeVisible()

  await page.click('"definition"')
  await expect(page.getByText('SQL Definition of actor_info')).toBeVisible()
  await expect(page.getByText('create view')).toBeVisible()
  await expect(page.getByText('public.actor_info as')).toBeVisible()
})

test('filter view by id', async ({ page }) => {
  // id of actor_info view in supabase
  await page.goto(actorInfoViewUrl)

  await expect(page.getByRole('columnheader').first()).toBeVisible({ timeout: 20000 })

  await page.click('"Filter"', { delay: 50 })
  await page.click('"Add filter"', { delay: 50 })
  await page.getByPlaceholder('Enter a value').type('4', { delay: 20 })
  await page.click('"Apply filter"', { delay: 50 })
  await page.click('.sb-grid')

  const resp = await page.waitForResponse(/query\?key=public-actor_info/)
  expect(resp.ok()).toBe(true)
  await expect(page.getByText('Loading records count...')).not.toBeVisible()

  const filteredRows = await page.$$('.rdg-row')
  expect(filteredRows.length).toBe(1)
  const filteredIds = await filteredRows[0].$$eval('.rdg-cell', (cells) => cells[1].textContent)
  expect(filteredIds).toBe('4')
})
