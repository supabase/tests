import { expect } from '@playwright/test'
import { test } from '../../src/execution/persistent-ctx'

const dashboardUrl = process.env.SUPA_DASHBOARD || 'https://app.supabase.com'
const projectId = process.env.FE_TESTS_PROJECT_REF || 'aaaaaaaaaaaaaaaaaaaa'
const editorUrl = `${dashboardUrl}/project/${projectId}/editor`

test('editor opens', async ({ page }) => {
  await page.goto(editorUrl)

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/frontend-tests/)
})

test('select schema', async ({ page }) => {
  await page.goto(editorUrl)

  await page.isEnabled('"public"')
  await page.click('"schema"')
  await page.hover('"auth"')
  await page.click('"auth"', { delay: 50 })

  await page.click('nav >> "users"')
  await expect(page.getByRole('columnheader').first()).toBeVisible()
})

test('search table', async ({ page }) => {
  await page.goto(editorUrl)

  await page.getByPlaceholder('Search tables').type('staff', { delay: 20 })

  const menu = await page.$('nav')
  const staffMenuItems = (await menu?.$$('"staff"'))?.length
  const menuItems = (await menu?.$$('a'))?.length
  expect(staffMenuItems).toBe(menuItems)

  await page.click('"staff"', { delay: 50 })
  await expect(page.getByRole('columnheader').first()).toBeVisible()
})

test('search view', async ({ page }) => {
  await page.goto(editorUrl)

  await page.getByPlaceholder('Search tables').type('actor_info', { delay: 20 })

  const menu = await page.$('nav')
  const viewMenuItems = (await menu?.$$('"actor_info"'))?.length
  const menuItems = (await menu?.$$('a'))?.length
  expect(viewMenuItems).toBe(menuItems)

  await page.click('"actor_info"', { delay: 50 })
  await expect(page.getByRole('columnheader').first()).toBeVisible()
})

// todo: rewrite to be atomic by deleting via API in the create test, and creating via API in the delete test
test.describe.serial('table operations', () => {
  const tableName = 'test_table_' + Date.now()
  test('create simple table', async ({ page }) => {
    await page.goto(editorUrl)
    await page.click('"New table"', { delay: 50 })

    await page.getByText(/Create a new table under/).isVisible()
    await page.type('input:right-of(:text("Name"))', tableName, { delay: 20 })

    await page.click('"Save"', { delay: 50 })
    const resp = await page.waitForResponse((r) => {
      return r.url().includes('tables?id=') && r.request().method() === 'GET'
    })
    expect(resp.ok()).toBeTruthy()
  })

  // todo: add test for search bug: search for table -> click on the result => search input is cleared
  // todo: remove this once the search bug is fixed
  test('delete table workaround', async ({ page }) => {
    await page.goto(editorUrl)
    await page.getByPlaceholder('Search tables').type(tableName, { delay: 20 })
    await page.click(`"${tableName}"`, { delay: 50 })

    // this is needed because of the search bug if you immediately click on table
    await page.getByPlaceholder('Search tables').type(tableName, { delay: 20 })

    await page.click(`button:right-of(:text("${tableName}"))`)
    await page.click('"Delete Table"', { delay: 50 })
    await page.click('"Delete"', { delay: 300 })

    const resp = await page.waitForResponse((r) => {
      return r.url().includes('tables?id=') && r.request().method() === 'DELETE'
    })
    expect(resp.ok()).toBeTruthy()
  })

  // todo: enable this once the search bug is fixed
  test.fixme('delete table', async ({ page }) => {
    await page.goto(editorUrl)
    await page.getByPlaceholder('Search tables').type(tableName, { delay: 20 })
    await page.click(`"${tableName}"`, { delay: 50 })

    await page.click(`button:right-of(:text("${tableName}"))`)
    await page.click('"Delete Table"', { delay: 50 })
    await page.click('"Delete"', { delay: 50 })

    const resp = await page.waitForResponse((r) => {
      return r.url().includes('tables?id=') && r.request().method() === 'DELETE'
    })
    expect(resp.ok()).toBeTruthy()
  })
})
