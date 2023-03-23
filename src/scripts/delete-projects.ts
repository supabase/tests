import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'

import crossFetch from '../common/timeoutFetch'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const supaPlatformUri = process.env.SUPA_API_V0_URI // https://api.supabase.green/v0
assert(supaPlatformUri, 'SUPA_API_V0_URI is not set')
const supaAccessToken = process.env.SUPA_ACCESS_TOKEN // sbp_v0_...
assert(supaAccessToken, 'SUPA_ACCESS_TOKEN is not set')
const projectsFile = process.env.PROJECTS_JSON || 'projects.json'
;(async () => {
  // read project ref from file
  const refs = JSON.parse(fs.readFileSync(projectsFile, 'utf8'))
  const apiKey = supaAccessToken

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }

  console.time('delete projects')
  let ctr = 0
  for (const ref of refs) {
    ctr++
    const deleteResp = await crossFetch(
      `${supaPlatformUri}/projects/${ref}`,
      {
        method: 'DELETE',
        headers: headers,
      },
      60000
    )
    if (ctr % 10 === 0) {
      console.timeLog('delete projects', ctr)
    }
    if (deleteResp.status !== 200) {
      console.log(
        `Failed to delete project ("${ref}") ${deleteResp.status}: ${deleteResp.statusText}`
      )
    }
  }
  console.timeEnd('delete projects')
})()
