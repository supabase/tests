import assert from 'assert'

import { createClient } from '@supabase/supabase-js'

import crossFetch from '../common/retriedFetch'

export async function waitForProjectStatus(
  expectedStatus: string,
  supaUri: string,
  ref: string,
  headers: any,
  retries = 60
) {
  for (let i = 0; i < retries; i++) {
    try {
      const statusResp = await crossFetch(`${supaUri}/projects/${ref}/status`, {
        headers: headers,
      })
      if (statusResp.status != 200) {
        console.log(
          `Failed to get project status ${statusResp.statusText} ${
            statusResp.status
          } ${await statusResp.text()}`
        )
      }
      assert(statusResp.status == 200)
      const { status } = await statusResp.json()
      assert(status == expectedStatus)
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

export async function waitForStorageReady(endpoint: string, serviceKey: string, sleepSecs = 75) {
  await new Promise((resolve) => setTimeout(resolve, sleepSecs * 1000))
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
