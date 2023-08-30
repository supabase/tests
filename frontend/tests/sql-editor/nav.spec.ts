import { Locator, Page, expect } from '@playwright/test'
import { test } from '../../src/execution/persistent-ctx'

const dashboardUrl = process.env.SUPA_DASHBOARD || 'https://app.supabase.com'
const projectId = process.env.FE_TESTS_PROJECT_REF || 'aaaaaaaaaaaaaaaaaaaa'
const editorUrl = `${dashboardUrl}/project/${projectId}/sql`

// weird thing, in playwright UI test runner it acts as linux/windows and works with Control
const cmdKey = process.env.CI && process.platform === 'darwin' ? 'Meta' : 'Control'

test('sql editor opens with welcome screen', async ({ page }) => {
  await page.goto(editorUrl)

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/SQL Editor/)

  const welcomePageTitle = page.getByText(/Quick scripts to run on your database./)
  const scriptTitle = page.getByText(/Create table./)
  const scriptDescription = page.getByText(
    /Basic table template. Change "table_name" to the name you prefer./
  )

  await Promise.all([
    expect(welcomePageTitle).toBeVisible(),
    expect(scriptTitle).toBeVisible(),
    expect(scriptDescription).toBeVisible(),
  ])
})

test('switch between 2 queries and verify the right one executed', async ({ page }) => {
  test.slow()

  let snippetOneUrl: string = ''
  let snippetTwoUrl: string = ''

  await test.step('Arrange: create 2 snippets and execute the first one', async () => {
    await test.step('Go to SQL editor', async () => {
      await page.goto(editorUrl)
      // wait for API calls to finish
      const entityDefinitions = await page.waitForResponse((r) => {
        return r.url().includes('/query?key=project-read-only') && r.request().method() === 'POST'
      })
      expect(entityDefinitions.ok()).toBeTruthy()
    })

    await test.step('Create first snippet and run it', async () => {
      snippetOneUrl = await createSnippetGUI(page)
      await enterMonacoQueryGUI(page, 'select * from public.city')

      const firstSqlQueryResp = await executeQueryGUI(page)
      expect(firstSqlQueryResp.ok()).toBeTruthy()
      await expect(page.getByText(/Abha/)).toBeVisible()
      await expect(page.getByText(/Abu Dhabi/)).toBeVisible()
      await expect(page.getByText(/Acua/)).toBeVisible()
    })

    await test.step('Create second snippet', async () => {
      snippetTwoUrl = await createSnippetGUI(page)
      await enterMonacoQueryGUI(page, 'select * from public.actor')
    })
  })

  await test.step('Act: switch between snippets and execute the second query', async () => {
    await test.step('Switch between snippets', async () => {
      // todo: add snippet renames and search by name to not fail if there >20 snippets
      await page.click(`a[href="${snippetOneUrl.replace(dashboardUrl, '')}"]`)
      await page.click(`a[href="${snippetTwoUrl.replace(dashboardUrl, '')}"]`)
      await page.click(`a[href="${snippetOneUrl.replace(dashboardUrl, '')}"]`)
      await page.click(`a[href="${snippetTwoUrl.replace(dashboardUrl, '')}"]`)
    })

    await test.step('Run 2nd query snippet', async () => {
      const secondSqlQueryResp = await executeQueryGUI(page)
      expect(secondSqlQueryResp.ok()).toBeTruthy()
      // check results are displaying
      await expect(page.getByText(/Penelope/)).toBeVisible()
      await expect(page.getByText(/Nick/)).toBeVisible()
      await expect(page.getByText(/Jennifer/)).toBeVisible()
    })
  })

  await test.step('Cleanup: delete snippets', async () => {
    // todo: replace with API calls
    await deleteSnippetGUI(page, snippetOneUrl)

    // check that the modal is no longer visible so we can delete second snippet
    await expect(page.getByText(/Confirm to delete/)).not.toBeVisible()

    await deleteSnippetGUI(page, snippetTwoUrl)
  })
})

async function executeQueryGUI(page: Page) {
  // Get the Monaco Editor instance
  const monacoEditor = page.locator('.monaco-editor').first()
  await monacoEditor.waitFor({ state: 'visible' })
  await monacoEditor.focus()
  await monacoEditor.click({ delay: 20 })
  await page.keyboard.press(`${cmdKey}+Enter`, { delay: 100 })

  const sqlQueryResp = await page.waitForResponse((r) => {
    return r.url().includes('/query') && r.request().method() === 'POST'
  })
  return sqlQueryResp
}

async function enterMonacoQueryGUI(page: Page, query: string = ''): Promise<Locator> {
  // Wait for Monaco Editor to be ready
  const monacoEditor = page.locator('.monaco-editor').first()
  await monacoEditor.waitFor({ state: 'visible' })
  await monacoEditor.click({ delay: 20 })

  // Emulate typing using low-level key events
  await page.keyboard.press(`${cmdKey}+A`) // Select all existing text
  await page.keyboard.press('Backspace') // Delete the selected text
  await page.keyboard.type(query) // Type the desired text
  return monacoEditor
}

async function createSnippetGUI(page: Page): Promise<string> {
  await page.click('"New query"', { delay: 20 })

  await page.click('"New blank query"', { delay: 20 })
  const createFirstSnippetResp = await page.waitForResponse((r) => {
    return r.url().includes('/content') && r.request().method() === 'POST'
  })
  expect(createFirstSnippetResp.ok()).toBeTruthy()
  const snippetOneUrl = page.url()
  return snippetOneUrl
}

async function deleteSnippetGUI(page: Page, snippetOneUrl: string) {
  // click the snippet
  await page.click(`a[href="${snippetOneUrl.replace(dashboardUrl, '')}"]`)
  // context menu button now available to click
  await page.click(`a[href="${snippetOneUrl.replace(dashboardUrl, '')}"] + div div button`)

  // Check dropdown appeared
  await expect(page.getByText(/Delete query/)).toBeVisible()
  await page.click('"Delete query"')

  // delete the snippet
  await page.click('"Delete query"')
  const deleteSnippetResp = await page.waitForResponse((r) => {
    return r.url().includes('/content') && r.request().method() === 'DELETE'
  })
  expect(deleteSnippetResp.ok()).toBeTruthy()
}
