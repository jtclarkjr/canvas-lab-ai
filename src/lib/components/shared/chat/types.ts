export type MentionMember = { id: string; name: string; color: string }
export type ChatComposerDensity = 'compact' | 'touch'

export type ChatComposerProps = {
  density?: ChatComposerDensity
  disabled?: boolean
  isStreaming?: boolean
  placeholder?: string
  className?: string
  webSearch?: boolean
  onWebSearchToggle?: () => void
  onSend: (text: string) => void
  mentionMembers?: MentionMember[]
}
