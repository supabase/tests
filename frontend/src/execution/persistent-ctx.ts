import os from 'os'
import fs from 'fs'
import { test as base } from '@playwright/test'
import { BrowserContext, chromium, Page } from 'playwright'

export const test = base.extend<
  {
    page: Page
    persistentContext: BrowserContext
  },
  {}
>({
  // We need to explicitly create a persistent context to
  // allow tests to run behind authenticated routes.
  persistentContext: [
    async ({}, use) => {
      const userDataDir = fs.mkdtempSync(os.tmpdir() + '/playwright-')
      const contextDir = process.env.CONTEXT_DIR
      if (!contextDir) {
        throw new Error('CONTEXT_DIR env variable is not set')
      }
      // copy the directory contextDir to temp userDataDir for worker
      fs.cpSync(contextDir, userDataDir, { recursive: true })

      const context = await chromium.launchPersistentContext(userDataDir)

      await use(context)
    },
    { scope: 'test' },
  ],

  page: [
    async ({ persistentContext: context }, use) => {
      const page = await context.newPage()
      await use(page)
    },
    { scope: 'test' },
  ],
})
