import assert from 'assert'
import fs from 'fs'
import dotenv from 'dotenv'
import { faker } from '@faker-js/faker'
import { createClient } from '@supabase/supabase-js'

import crossFetch from '../common/timeoutFetch'
import { getAccessToken } from '../auth/getUserToken'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const supaPlatformUri = process.env.SUPA_PLATFORM_URI
assert(supaPlatformUri, 'SUPA_PLATFORM_URI is not set')
const supaOrgID = process.env.SUPA_ORG_ID
assert(supaOrgID, 'SUPA_ORG_ID is not set')
const orgID = parseInt(supaOrgID)
const supaRegion = process.env.SUPA_REGION || 'Southeast Asia (Singapore)'
const outputFile = process.env.OUTPUT_FILE || '.env'
const projectFile = process.env.PROJECT_JSON || 'project.json'

;(async () => {
  // login to supabase
  const { apiKey } = await getAccessToken()
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
  assert(createResp.status == 201)
  const project = await createResp.json()
  const ref = project.ref

  // wait for project to be ready
  for (let i = 0; i < 60; i++) {
    try {
      const statusResp = await crossFetch(`${supaPlatformUri}/projects/${ref}/status`, {
        headers: headers,
      })
      assert(statusResp.status == 200)
      const { status } = await statusResp.json()
      assert(status == 'ACTIVE_HEALTHY')
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

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
        EXTERNAL_PHONE_ENABLED: true,
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
    console.log('could not patch auth config')
  }

  // wait for storage to be ready for project
  for (let i = 0; i < 20; i++) {
    try {
      const supabase = createClient(project.endpoint, project.service_key)
      const { error: errList } = await supabase.storage.listBuckets()
      assert(errList == null)
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
})()
