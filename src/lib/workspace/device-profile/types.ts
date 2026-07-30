export type WorkspaceShell = 'desktop' | 'tablet' | 'phone'

export type WorkspaceDeviceProfile = {
  shell: WorkspaceShell
  isTouchLike: boolean
  hasFinePointer: boolean
  hasHover: boolean
  viewportWidth: number
  viewportHeight: number
}
