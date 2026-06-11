export function createThrottledCursorSender(delay: number) {
  let lastCall = 0
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (callback: (event: MouseEvent) => void, event: MouseEvent) => {
    const now = Date.now()
    const remaining = delay - (now - lastCall)

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      lastCall = now
      callback(event)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now()
        timeout = null
        callback(event)
      }, remaining)
    }
  }
}
