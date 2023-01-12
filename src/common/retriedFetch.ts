import timeoutFetch from './timeoutFetch'

export default async function retriedFetch(
  input: RequestInfo,
  init?: RequestInit,
  timeout: number = 5000,
  retries: number = 3
): Promise<Response> {
  for (let i = 0; i < retries - 1; i++) {
    try {
      const res = await timeoutFetch(input, init, timeout)
      if (res.status >= 100 && res.status < 400) {
        return res
      }
      console.log(`Retrying fetch ${i}`, res.status, res.statusText)
    } catch (e) {
      console.log(`Retrying fetch ${i}`, e)
    }
  }
  return await timeoutFetch(input, init, timeout)
}
