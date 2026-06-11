export type Toast = {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'error'
  action?: {
    label: string
    onClick: () => void
  }
}

const DEFAULT_DURATION = 5000

let toasts = $state<Toast[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function dismiss(id: string) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts = toasts.filter((entry) => entry.id !== id)
}

function show(input: Omit<Toast, 'id'>, duration = DEFAULT_DURATION) {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, ...input }]

  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration)
    )
  }

  return id
}

export const toast = {
  get items() {
    return toasts
  },
  show,
  dismiss
}
