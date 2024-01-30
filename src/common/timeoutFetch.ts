import crossFetch from 'cross-fetch'
import timeoutPromise from './timeout'

export default async function fetch(
  input: RequestInfo,
  init?: RequestInit,
  timeout: number = 10000
): Promise<Response> {
  const abort = new AbortController()
  if (init) init.signal = abort.signal
  if (init?.method === 'POST' && timeout === 10000) {
    timeout = 15000
  }
  return timeoutPromise(crossFetch(input, init), timeout, abort)
}
