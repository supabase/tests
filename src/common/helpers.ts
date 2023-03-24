import assert from 'assert'

import { createClient } from '@supabase/supabase-js'

import crossFetch from '../common/timeoutFetch.js'

export async function waitForProjectStatus(
  expectedStatus: string,
  supaUri: string,
  ref: string,
  headers: any
) {
  for (let i = 0; i < 60; i++) {
    try {
      process.stdout.write('.')
      const statusResp = await crossFetch(`${supaUri}/projects/${ref}/status`, {
        headers: headers,
      })
      assert(statusResp.status == 200)
      const { status } = await statusResp.json()
      assert(status == expectedStatus)
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

export async function waitForStorageReady(endpoint: string, serviceKey: string) {
  await new Promise((resolve) => setTimeout(resolve, 75*1000))
  let successfulStorageCalls = 0
  for (let i = 0; i < 30; i++) {
    try {
      const supabase = createClient(endpoint, serviceKey)
      const { error: errList } = await supabase.storage.listBuckets()
      assert(errList == null)
      successfulStorageCalls++
      if (successfulStorageCalls == 10) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}
