import assert from 'assert'

import crossFetch from '../common/timeoutFetch'

export async function waitForProjectStatus(
  expectedStatus: string,
  supaUri: string,
  ref: string,
  headers: any
) {
  for (let i = 0; i < 60; i++) {
    try {
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
