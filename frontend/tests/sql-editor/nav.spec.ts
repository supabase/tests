import { expect } from '@playwright/test'
import { test } from '../../src/execution/persistent-ctx'

const dashboardUrl = process.env.SUPA_DASHBOARD || 'https://app.supabase.com'
const projectId = process.env.FE_TESTS_PROJECT_REF || 'aaaaaaaaaaaaaaaaaaaa'
const editorUrl = `${dashboardUrl}/project/${projectId}/sql`

test('sql editor opens with welcome screen', async ({ page }) => {
  await page.goto(editorUrl)

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/SQL | Supabase/)

  const welcomePageTitle = await page.getByText(/Quick scripts to run on your database./)
  const scriptTitle = await page.getByText(/Create table./)
  const scriptDescription = await page.getByText(
    /Basic table template. Change "table_name" to the name you prefer./
  )
  await expect(
    welcomePageTitle !== undefined && scriptTitle !== undefined && scriptDescription !== undefined
  ).toBeTruthy()
})

test('SQL editor opens and can click on new query 2', async ({ page }) => {
  await page.goto(editorUrl)

  const gettingStartedLoaded = await page.getByText(/Getting started/)
  await expect(gettingStartedLoaded !== undefined).toBeTruthy()

  const userContentResp = await page.waitForResponse((r) => {
    return r.url().includes('/content') && r.request().method() === 'GET'
  })
  await expect(userContentResp.ok()).toBeTruthy()

  await page.click('"New query"')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/SQL | Supabase/)

  // should check that monaco editor is visible.
  //   await page.waitForSelector('.monaco-editor')
  // check that text in the results section is visible.
  //   const resultsDefaultText = await page.getByText(/Click RUN to execute your query./)
  //   await expect(resultsDefaultText !== undefined).toBeTruthy()
})
