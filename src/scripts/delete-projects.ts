import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'
import _ from 'lodash'

import crossFetch from '../common/timeoutFetch.js'

dotenv.config({ path: `.env` })
dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const supaPlatformUri = process.env.SUPA_API_V0_URI // https://api.supabase.green/v0
assert(supaPlatformUri, 'SUPA_API_V0_URI is not set')
const supaAccessToken = process.env.SUPA_ACCESS_TOKEN // sbp_v0_...
assert(supaAccessToken, 'SUPA_ACCESS_TOKEN is not set')
const projectsFile = process.env.PROJECTS_JSON || 'projects.json'
const batchSize = parseInt(process.env.BATCH_SIZE || '5')

;(async () => {
  // read project ref from file
  const refs = JSON.parse(fs.readFileSync(projectsFile, 'utf8'))

  console.time('delete projects')
  for (const chunk of _.chunk(refs, batchSize)) {
    await Promise.all(_.map(chunk, deleteProject))
    console.timeLog('delete projects')
  }
  console.timeEnd('delete projects')
})()

async function deleteProject(ref: string) {
  process.stdout.write('.')
  const apiKey = supaAccessToken
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }
  const deleteResp = await crossFetch(
    `${supaPlatformUri}/projects/${ref}`,
    {
      method: 'DELETE',
      headers: headers,
    },
    100000
  )
  if (deleteResp.status !== 200) {
    console.log(
      `Failed to delete project ("${ref}") ${deleteResp.status}: ${deleteResp.statusText}`
    )
  }
}
