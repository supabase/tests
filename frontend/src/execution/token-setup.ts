import dotenv from 'dotenv'
import { getAccessToken } from '../../../src/auth/getUserToken'

export default async () => {
  dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

  let apiKey, contextDir
  try {
    const res = await getAccessToken()
    apiKey = res.apiKey
    contextDir = res.contextDir
  } catch (e) {
    const res = await getAccessToken()
    apiKey = res.apiKey
    contextDir = res.contextDir
  }

  process.env.ACCESS_TOKEN = apiKey
  process.env.CONTEXT_DIR = contextDir
}
