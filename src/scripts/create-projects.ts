import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'
import { faker } from '@faker-js/faker'

import crossFetch from '../common/timeoutFetch'
import { waitForProjectStatus } from '../common/helpers'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const supaPlatformUri = process.env.SUPA_API_V0_URI // https://api.supabase.green/v0
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

;(async () => {
  // login to supabase (just use token now)
  const apiKey = supaAccessToken

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }

  // create projects
  const refs = []
  const batchSize = 5
  console.time('create projects')
  for (let i = 0; i < projectsCount / batchSize; i++) {
    console.time('create projects batch ' + i)
    const promises = []
    for (let j = 0; j < batchSize; j++) {
      promises.push(
        new Promise<string>(async (resolve) => {
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
              console.log(await createResp.text())
              resolve('')
            }
            const project = await createResp.json()
            console.log(project.ref)
            resolve(project.ref)
          } catch (e) {
            console.log('error creating project')
            resolve('')
          }
        })
      )
    }
    const results = await Promise.all(promises)
    console.timeEnd('create projects batch ' + i)
    console.timeLog('create projects', i)
    refs.push(...results.filter((ref) => ref != ''))
  }
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
