import fs from 'fs'
import { BrowserContext, chromium } from 'playwright'

export abstract class Hooks {
  protected static SupaPlatformURI = process.env.SUPA_PLATFORM_URI
  protected static accessToken: string
  protected static headers: HeadersInit
  protected contextDir: string
  protected browserCtx: BrowserContext

  static async before() {
    this.accessToken = process.env.ACCESS_TOKEN
    this.headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'content-type': 'application/json',
    }
  }

  async before(): Promise<any> {
    this.contextDir = fs.mkdtempSync('supabase--browser-context-')
    fs.cpSync(process.env.CONTEXT_DIR, this.contextDir, { recursive: true })
    this.browserCtx = await chromium.launchPersistentContext(this.contextDir, { headless: false })
  }

  async after(): Promise<any> {
    try {
      await this.browserCtx.close()
    } catch (err) {
      console.log(err)
    }
    try {
      fs.rmSync(this.contextDir, { recursive: true })
    } catch (err) {
      console.log(err)
    }
  }
}
