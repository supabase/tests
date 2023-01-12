import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'

import crossFetch from '../common/timeoutFetch'
import { getAccessToken } from '../auth/getUserToken'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const supaPlatformUri = process.env.SUPA_PLATFORM_URI
assert(supaPlatformUri, 'SUPA_PLATFORM_URI is not set')
const projectFile = process.env.PROJECT_JSON || 'project.json'
;(async () => {
  // read project ref from file
  const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'))

  if (!project.apiKey) {
    const { apiKey } = await getAccessToken()
    project.apiKey = apiKey
  }
  const apiKey = project.apiKey

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }

  const deleteResp = await crossFetch(
    `${supaPlatformUri}/projects/${project.ref}`,
    {
      method: 'DELETE',
      headers: headers,
    },
    15000
  )
  assert(
    deleteResp.status == 200,
    `Failed to delete project ${deleteResp.status}: ${deleteResp.statusText}`
  )
})()
