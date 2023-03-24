import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'
import { faker } from '@faker-js/faker'
import _ from 'lodash'
import PQueue from 'p-queue'

import crossFetch from '../common/timeoutFetch.js'
import { waitForProjectStatus } from '../common/helpers.js'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })
dotenv.config({ path: `.env` })

const supaPlatformUri = process.env.SUPA_API_V0_URI || '' // https://api.supabase.green/v0
assert(supaPlatformUri, 'SUPA_API_V0_URI is not set')
const supaAccessToken = process.env.SUPA_ACCESS_TOKEN // sbp_v0_...
assert(supaAccessToken, 'SUPA_ACCESS_TOKEN is not set')
const supaOrgID = process.env.SUPA_ORG_ID
assert(supaOrgID, 'SUPA_ORG_ID is not set')
const orgID = parseInt(supaOrgID)
const projectsNumber = process.env.PROJECTS_NUMBER || '10'
const projectsCount = parseInt(projectsNumber)
const supaRegion = process.env.SUPA_REGION || 'Southeast Asia (Singapore)'
const projectsFile = process.env.PROJECTS_JSON || 'projects.json'
const batchSize = parseInt(process.env.BATCH_SIZE || '5')

const apiKey = supaAccessToken
const headers = {
  Authorization: `Bearer ${apiKey}`,
  'content-type': 'application/json',
}

const refs: string[] = []

console.log(`going to create ${projectsCount} projects in batches of ${batchSize}`)
;(async () => {
  // login to supabase (just use token now)
  // create projects
  console.time('create projects')
  const q = new PQueue({
    carryoverConcurrencyCount: true,
    interval: 500,
    intervalCap: 15
  })
  const creationPromises = _.map(_.range(projectsCount), async (i) => {
    await q.add(() => createProject(i))
  })

  await q.onIdle()
  console.log('refs are ', refs)
  console.timeEnd('create projects')
  // wait for project to be ready
  console.time('wait for projects healthy')
  const promises = refs.map((ref) =>
    waitForProjectStatus('ACTIVE_HEALTHY', supaPlatformUri, ref, headers)
  )
  await Promise.all(promises)
  console.timeEnd('wait for projects healthy')

  // save project body to file
  fs.writeFileSync(projectsFile, JSON.stringify(refs, null, 2))
})()


async function createProject(e: number) {
  console.log('creting new project!', e)
  const dbPass = faker.internet.password()
  try {
    const createResp = await crossFetch(
      `${supaPlatformUri}/projects`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          cloud_provider: 'AWS',
          org_id: orgID,
          name: faker.internet.domainWord(),
          db_pass: dbPass,
          db_region: supaRegion,
          db_pricing_tier_id: 'tier_free',
          kps_enabled: false,
        }),
      },
      180000
    )
    if (createResp.status != 201) {
      console.log(createResp.status, createResp.statusText)
      // console.log(await createResp.text())
    }
    const project = await createResp.json()
    console.log(`${e}: ${project.ref}`)
    refs.push(project.ref)
    return project.ref
  } catch (e) {
    console.log('error creating project')
    return ''
  }
}
