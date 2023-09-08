import dotenv from 'dotenv'

export default () => {
  dotenv.config({ path: `.env.${process.env.NODE_ENV}` })
}
