import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'

import crossFetch from '../common/timeoutFetch'
import { authenticate } from '../auth/getUserToken'
import { waitForProjectStatus, waitForStorageReady } from '../common/helpers'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const supaPlatformUri = process.env.SUPA_PLATFORM_URI
assert(supaPlatformUri, 'SUPA_PLATFORM_URI is not set')
const projectFile = process.env.PROJECT_JSON || 'project.json'
;(async () => {
  // read project ref from file
  console.log('Pausing project...')
  const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'))

  const { apiKey } = await authenticate()
  project.apiKey = apiKey

  console.log('API Key acquired')

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }

  console.log('Pausing project...')
  const pauseResp = await crossFetch(
    `${supaPlatformUri}/projects/${project.ref}/pause`,
    {
      method: 'POST',
      headers: headers,
    },
    15000
  )
  if (pauseResp.status != 201) {
    console.log(await pauseResp.text())
  }
  assert(
    pauseResp.status == 201,
    `Failed to pause project ${pauseResp.status}: ${pauseResp.statusText}`
  )
  console.log(`${pauseResp.status}: ${pauseResp.statusText}`)

  // wait for project to be paused
  console.log('Waiting for project to be paused...')
  await waitForProjectStatus('INACTIVE', supaPlatformUri, project.ref, headers, 150)
  console.log('Project paused')

  console.log('Restoring project...')
  const restoreResp = await crossFetch(
    `${supaPlatformUri}/projects/${project.ref}/restore`,
    {
      method: 'POST',
      headers: headers,
    },
    15000
  )
  assert(
    restoreResp.status == 201,
    `Failed to restore project ${restoreResp.status}: ${restoreResp.statusText}`
  )
  console.log(`${restoreResp.status}: ${restoreResp.statusText}`)

  // wait for project to be restored
  console.log('Waiting for project to be active running...')
  await waitForProjectStatus('ACTIVE_HEALTHY', supaPlatformUri, project.ref, headers)

  // wait for storage to be ready for project
  console.log('Waiting for storage to be healthy...')
  await waitForStorageReady(project.endpoint, project.service_key)
  console.log('Project is running again')
})()
