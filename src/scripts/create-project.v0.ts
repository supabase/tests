import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'
import { faker } from '@faker-js/faker'

import crossFetch from '../common/timeoutFetch'
import { waitForProjectStatus, waitForStorageReady } from '../common/helpers'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const supaPlatformUri = process.env.SUPA_PLATFORM_URI
assert(supaPlatformUri, 'SUPA_PLATFORM_URI is not set')
const apiKey = process.env.SUPA_V0_KEY
assert(apiKey, 'SUPA_V0_KEY is not set')
const supaOrgID = process.env.SUPA_ORG_ID
assert(supaOrgID, 'SUPA_ORG_ID is not set')
const orgID = parseInt(supaOrgID)
const supaRegion = process.env.SUPA_REGION || 'Southeast Asia (Singapore)'
const outputFile = process.env.OUTPUT_FILE || '.env'
const projectFile = process.env.PROJECT_JSON || 'project.json'

;(async () => {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }

  // create project
  const dbPass = faker.internet.password()
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
    15000
  )
  if (createResp.status != 201) {
    console.log('could not create project')
    console.log(await createResp.text())
  }
  assert(createResp.status == 201, createResp.statusText)
  const project = await createResp.json()
  const ref = project.ref

  // wait for project to be ready
  await waitForProjectStatus('ACTIVE_HEALTHY', supaPlatformUri, ref, headers)

  const statusResp = await crossFetch(
    `${supaPlatformUri}/projects/${ref}/status`,
    {
      headers: headers,
    },
    10000
  )
  assert(statusResp.status == 200)
  const { status } = await statusResp.json()
  assert(status == 'ACTIVE_HEALTHY')

  // save project body to file
  project.db_pass = dbPass
  project.apiKey = apiKey
  fs.writeFileSync(projectFile, JSON.stringify(project, null, 2))
  fs.writeFileSync(
    outputFile,
    `SUPABASE_DB_HOST=${project.endpoint.replace('https://', 'db.')}
SUPABASE_DB_PORT=5432
SUPABASE_DB_PASS=${dbPass}
SUPABASE_GOTRUE=${project.endpoint}/auth/v1
SUPABASE_URL=${project.endpoint}
SUPABASE_KEY_ANON=${project.anon_key}
SUPABASE_KEY_ADMIN=${project.service_key}
ACCESS_TOKEN=${apiKey}
`
  )

  // update project auth settings to skip email verification as it may cause unnecessary flakiness
  const patchResp = await crossFetch(
    `${supaPlatformUri}/auth/${ref}/config`,
    {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify({
        // tune email login to not require email verification
        EXTERNAL_EMAIL_ENABLED: true,
        MAILER_AUTOCONFIRM: true,
        MAILER_SECURE_EMAIL_CHANGE_ENABLED: true,
        MAILER_OTP_EXP: 86400,
        PASSWORD_MIN_LENGTH: 6,
        // phone login enable, confirm is disabled
        EXTERNAL_PHONE_ENABLED: false,
        SMS_PROVIDER: 'twilio',
        SMS_TWILIO_ACCOUNT_SID: ' ',
        SMS_TWILIO_AUTH_TOKEN: ' ',
        SMS_TWILIO_MESSAGE_SERVICE_SID: ' ',
        SMS_AUTOCONFIRM: true,
        SMS_OTP_EXP: 60,
        SMS_OTP_LENGTH: 6,
        SMS_TEMPLATE: 'Your code is {{ .Code }}',
      }),
    },
    15000
  )
  if (patchResp.status != 200) {
    console.log(patchResp.status, patchResp.statusText)
    console.log(await patchResp.text())
    console.log('could not patch auth config')
  }

  // wait for storage to be ready for project
  await waitForStorageReady(project.endpoint, project.service_key)
})()
