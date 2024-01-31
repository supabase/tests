export default async function timeoutRequest<T>(
  request: Promise<T>,
  timeout: number,
  abort?: AbortController
): Promise<T> {
  let timer: NodeJS.Timeout

  request
    .catch((err) => {
      console.error(`request error: ${err.message}`)
    })
    .finally(() => clearTimeout(timer))

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout (${timeout}) for task exceeded`))
    }, timeout)
  })

  return Promise.race<T>([request, timeoutPromise])
}
