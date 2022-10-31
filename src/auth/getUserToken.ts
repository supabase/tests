import { faker } from '@faker-js/faker'
import crossFetch from '../common/timeoutFetch'
import { chromium } from 'playwright'
import * as OTPAuth from 'otpauth'

import { Session } from '../../src/types/session'
import assert from 'assert'

// a bit too complicated to do auth with github via API, so we do authorization with GUI
const getAccessToken = async () => {
  const githubTotp = process.env.GITHUB_TOTP
  const githubUser = process.env.GITHUB_USER
  const githubPass = process.env.GITHUB_PASS
  const supaDashboard = process.env.SUPA_DASHBOARD
  const supaPlatformUri = process.env.SUPA_PLATFORM_URI
  assert(githubTotp, 'GITHUB_TOTP is not set')
  assert(githubUser, 'GITHUB_USER is not set')
  assert(githubPass, 'GITHUB_PASS is not set')
  assert(supaDashboard, 'SUPA_DASHBOARD is not set')
  assert(supaPlatformUri, 'SUPA_PLATFORM_URI is not set')

  // GH auth always uses 2FA and it is not possible to disable it so we use TOTP
  let totp = new OTPAuth.TOTP({
    label: 'Github',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: githubTotp,
  })

  let token: Session
  let contextDir = `browserContext-${faker.datatype.number({ min: 1, max: 9999 })}`
  const context = await chromium.launchPersistentContext(contextDir, {
    headless: true,
  })
  try {
    // Go to app.supabase.io
    const page = await context.newPage()
    await page.goto(supaDashboard)
    await page.locator('button:has-text("Sign In with GitHub")').first().click()

    // REdirected to GitHub: interact with login form
    await page.fill('input[name="login"]', githubUser)
    await page.fill('input[name="password"]', githubPass)
    await page.click('input[name="commit"]')

    // Pass 2FA
    await page.fill('input[name="otp"]', totp.generate())
    // In case verification has not started automatically on code submission
    try {
      if (
        (await page.locator('button[type="submit"]').first().isVisible()) &&
        (await page.locator('button[type="submit"]').first().isEnabled())
      ) {
        await page.click('button[type="submit"]')
      }
    } catch (e) {
      // that may be cause by auto submit and redirect
      console.log(e)
    }

    // reauthorize supabase if needed
    try {
      if (await page.locator('"Authorize supabase"').isVisible({ timeout: 2000 })) {
        await page.locator('"Authorize supabase"').hover()
        await page.locator('"Authorize supabase"').isEnabled({ timeout: 10000 })
        await page.click('"Authorize supabase"')
      }
    } catch (e) {
      // small probability that GH may ask for authorization of supabase again
    }

    // Wait for redirect back to app.supabase.io(.green)
    try {
      await page.waitForNavigation({ url: /app.supabase./ })
      await page.waitForLoadState('networkidle')
    } catch {
      // a bit hard to make this reliable: we can sometimes not hit this wait condition and
      // navigation will happen before we this call, and then we will receive an error;
      // but if we omit this completely, we will get an error on the next call cause
      // we will be at the moment before redirect actually happens during the next call
    }
    await page.waitForLoadState('networkidle')
    await page.locator('button:has-text("New project")').first().isVisible({ timeout: 20000 })

    // get access token
    token = await page.evaluate<Session>(async () => {
      for (var i = 0; i < 100; i++) {
        if (
          localStorage.getItem('supabase.auth.token') !== null &&
          localStorage.getItem('supabase.dashboard.auth.token') !== null
        ) {
          console.log(
            'token found',
            localStorage.getItem('supabase.auth.token'),
            localStorage.getItem('supabase.dashboard.auth.token')
          )
          break
        }
        console.log('token not found')
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      let token = localStorage.getItem('supabase.auth.token')
      if (!token) {
        token = localStorage.getItem('supabase.dashboard.auth.token')
      }
      return token ? JSON.parse(token) : null
    })
  } catch (e) {
    console.log(e)
    token = {} as any
  } finally {
    // dispose browser context
    await context.close()
  }

  // check access token works
  const res = await crossFetch(`${supaPlatformUri}/projects`, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  })
  assert(res.ok === true)
  return {
    apiKey: token.access_token,
    contextDir: contextDir,
  }
}

export { getAccessToken }
