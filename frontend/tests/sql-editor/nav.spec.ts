import { expect } from '@playwright/test'
import { test } from '../../src/execution/persistent-ctx'

const dashboardUrl = process.env.SUPA_DASHBOARD || 'https://app.supabase.com'
const projectId = process.env.FE_TESTS_PROJECT_REF || 'aaaaaaaaaaaaaaaaaaaa'
const editorUrl = `${dashboardUrl}/project/${projectId}/sql`

const cmdKey = process.platform === 'darwin' ? 'Meta' : 'Control'

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

  // wait for API calls to finish
  //   const userContentResp = await page.waitForResponse((r) => {
  //     return r.url().includes('/content') && r.request().method() === 'GET'
  //   })
  //   const userPermissionsResp = await page.waitForResponse((r) => {
  //     return r.url().includes('/permissions') && r.request().method() === 'GET'
  //   })
  const entityDefinitions = await page.waitForResponse((r) => {
    return r.url().includes('/query?key=entity-definitions') && r.request().method() === 'POST'
  })
  //   await expect(userContentResp.ok()).toBeTruthy()
  //   await expect(userPermissionsResp.ok()).toBeTruthy()
  await expect(entityDefinitions.ok()).toBeTruthy()

  // create first snippet
  await await page.click('"New query"')

  const snippetOne = await page.url()
  console.log('first snippet', snippetOne)

  await page.goto(editorUrl)
  await page.goto(snippetOne)

  // Expect a title "to contain" a substring.
  //   await expect(page).toHaveTitle(/SQL | Supabase/)

  //
  //

  // Wait for Monaco Editor to be ready
  await page.waitForSelector('.monaco-editor')

  // Get the Monaco Editor instance
  const monacoEditor = await page.$('.monaco-editor')

  if (!monacoEditor) {
    console.error('Monaco Editor element not found')
    return
  }

  // Click on the Monaco Editor
  await monacoEditor.click()

  // Focus the Monaco Editor
  //   await monacoEditor?.focus()

  // Emulate typing using low-level key events
  await page.keyboard.press(`${cmdKey}+A`) // Select all existing text
  await page.keyboard.press('Backspace') // Delete the selected text
  await page.keyboard.type('Hello, Monaco Editor!') // Type the desired text

  // Simulate CMD+Enter keyboard shortcut
  await page.keyboard.down(cmdKey)
  await page.keyboard.press('Enter')
  await page.keyboard.up('Enter')
  await page.keyboard.up(cmdKey)

  const firstSqlQueryResp = await page.waitForResponse((r) => {
    return r.url().includes('/query') && r.request().method() === 'POST'
  })
  await expect(firstSqlQueryResp.ok()).toBeTruthy()

  await expect(page.getByText(/query should not be empty/)).toBeVisible()
  await expect(page.getByText(/Invalid SQL query/)).toBeVisible()

  // create first snippet
  //   await await page.click('"run"')
})
