import { expect } from '@playwright/test'
import { test } from '../../src/execution/persistent-ctx'
import { setTimeout } from 'timers'

const dashboardUrl = process.env.SUPA_DASHBOARD || 'https://app.supabase.com'
const projectId = process.env.FE_TESTS_PROJECT_REF || 'aaaaaaaaaaaaaaaaaaaa'
const editorUrl = `${dashboardUrl}/project/${projectId}/sql`

// weird thing, in playwright UI test runner it acts as linux/windows and works with Control
const cmdKey = process.env.CI && process.platform === 'darwin' ? 'Meta' : 'Control'

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

// test('just select something', async ({ page }) => {
//   await page.goto(editorUrl)

//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/SQL | Supabase/)

//   await page.click(`a[href=""]`)
// })

test('SQL editor opens and can click on new query 2', async ({ page }) => {
  await page.goto(editorUrl)

  const gettingStartedLoaded = page.getByText(/Getting started/)
  await expect(gettingStartedLoaded).toBeVisible()

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
  expect(entityDefinitions.ok()).toBeTruthy()

  // create first snippet
  await page.click('"New query"', { delay: 20 })

  const createFirstSnippetResp = await page.waitForResponse((r) => {
    return r.url().includes('/content') && r.request().method() === 'POST'
  })
  await expect(createFirstSnippetResp.ok()).toBeTruthy()

  const snippetOneUrl = await page.url()
  const snippetOne = page.url()
  // console.log('first snippet', snippetOne)

  // await page.goto(editorUrl)
  // await page.goto(snippetOne)

  // Expect a title "to contain" a substring.
  //   await expect(page).toHaveTitle(/SQL | Supabase/)

  //
  //

  // Wait for Monaco Editor to be ready
  const monacoEditor = await page.locator('.monaco-editor').first()

  // Get the Monaco Editor instance
  await monacoEditor.waitFor({ state: 'visible' })

  // Click on the Monaco Editor
  await monacoEditor.click({ delay: 20 })

  // Focus the Monaco Editor
  //   await monacoEditor?.focus()

  // Emulate typing using low-level key events
  await page.keyboard.press(`${cmdKey}+A`) // Select all existing text
  await page.keyboard.press('Backspace') // Delete the selected text
  await page.keyboard.type('select * from public.city') // Type the desired text

  await monacoEditor.focus()
  await page.keyboard.press(`${cmdKey}+Enter`, { delay: 100 })

  const firstSqlQueryResp = await page.waitForResponse((r) => {
    return r.url().includes('/query') && r.request().method() === 'POST'
  })

  expect(firstSqlQueryResp.ok()).toBeTruthy()
  await expect(page.getByText(/Abha/)).toBeVisible()
  await expect(page.getByText(/Abu Dhabi/)).toBeVisible()
  await expect(page.getByText(/Acua/)).toBeVisible()

  // create second snippet
  await await page.click('"New query"')

  const createSecondSnippetResp = await page.waitForResponse((r) => {
    return r.url().includes('/content') && r.request().method() === 'POST'
  })
  await expect(createSecondSnippetResp.ok()).toBeTruthy()

  const snippetTwoUrl = await page.url()

  // Click on the Monaco Editor
  await monacoEditor.click()
  // Emulate typing using low-level key events
  await page.keyboard.press(`${cmdKey}+A`) // Select all existing text
  await page.keyboard.press('Backspace') // Delete the selected text
  await page.keyboard.type('select * from public.actor') // Type the desired text

  // switch between snippets
  await page.click(`a[href="${snippetOneUrl.replace('https://app.supabase.green', '')}"]`)
  await page.click(`a[href="${snippetTwoUrl.replace('https://app.supabase.green', '')}"]`)
  await page.click(`a[href="${snippetOneUrl.replace('https://app.supabase.green', '')}"]`)
  await page.click(`a[href="${snippetTwoUrl.replace('https://app.supabase.green', '')}"]`)

  // run 2nd query
  // Get the Monaco Editor instance
  await monacoEditor.waitFor({ state: 'visible' })
  await monacoEditor.click({ delay: 20 })
  await monacoEditor.focus()
  await page.keyboard.press(`${cmdKey}+Enter`, { delay: 100 })

  const secondSqlQueryResp = await page.waitForResponse((r) => {
    return r.url().includes('/query') && r.request().method() === 'POST'
  })
  //   await expect(secondSqlQueryResp.ok()).toBeTruthy()
  // cause query is plain string, it's not valid right now
  expect(secondSqlQueryResp.ok()).toBeTruthy()

  // check results are displaying
  await expect(page.getByText(/Penelope/)).toBeVisible()
  await expect(page.getByText(/Nick/)).toBeVisible()
  await expect(page.getByText(/Jennifer/)).toBeVisible()

  // await expect(page.getByText(/query should not be empty/)).toBeVisible()

  // create first snippet
  //   await await page.click('"run"')
})
