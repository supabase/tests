import crossFetch from 'cross-fetch'
import timeoutPromise from './timeout'

export default async function fetch(
  input: RequestInfo,
  init?: RequestInit,
  timeout: number = 5000
): Promise<Response> {
  return timeoutPromise(crossFetch(input, init), timeout)
}
