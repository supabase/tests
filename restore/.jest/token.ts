import dotenv from 'dotenv'
import { authenticate } from '../../src/auth/getUserToken'

export default async () => {
  dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

  const { apiKey, contextDir } = await authenticate()
  process.env.ACCESS_TOKEN = apiKey
  process.env.CONTEXT_DIR = contextDir
}
