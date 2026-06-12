import { loadDevicePrefs, saveDevicePrefs } from '$lib/conference/helpers'
import type {
  ConferenceDevices,
  DeviceKind,
  DevicePrefs
} from '$lib/conference/types'
import { toast } from '$lib/stores/toast.svelte'

type ConferenceDevicesInput = {
  // Applies a chosen device to the live room, when one exists.
  applyToRoom: (kind: DeviceKind, deviceId: string) => Promise<void>
}

export function createConferenceDevicesStore({
  applyToRoom
}: ConferenceDevicesInput) {
  let devices = $state<ConferenceDevices>({
    cameras: [],
    mics: [],
    speakers: []
  })
  let devicesLoaded = $state(false)
  let activeDeviceIds = $state<DevicePrefs>(loadDevicePrefs())
  let settingsOpen = $state(false)

  const hasMic = $derived(!devicesLoaded || devices.mics.length > 0)
  const hasCamera = $derived(!devicesLoaded || devices.cameras.length > 0)

  async function refresh(requestPermissions = false) {
    const livekit = await import('livekit-client')
    try {
      const [cameras, mics, speakers] = await Promise.all([
        livekit.Room.getLocalDevices('videoinput', requestPermissions),
        livekit.Room.getLocalDevices('audioinput', requestPermissions),
        livekit.Room.getLocalDevices('audiooutput', requestPermissions)
      ])
      devices = { cameras, mics, speakers }
      devicesLoaded = true
    } catch {
      // Enumeration failing (no media subsystem at all) is treated like
      // having no devices; the join still proceeds without media.
      devices = { cameras: [], mics: [], speakers: [] }
      devicesLoaded = true
    }
  }

  function warnMissing() {
    if (!hasMic && !hasCamera) {
      toast.show({
        title: 'No microphone or camera found',
        description: 'You joined the call, but others cannot see or hear you.',
        variant: 'error'
      })
    } else if (!hasMic) {
      toast.show({
        title: 'No microphone found',
        description: 'You joined the call, but others cannot hear you.',
        variant: 'error'
      })
    } else if (!hasCamera) {
      toast.show({
        title: 'No camera found',
        description: 'You joined the call without video.'
      })
    }
  }

  async function switchDevice(kind: DeviceKind, deviceId: string) {
    activeDeviceIds = { ...activeDeviceIds, [kind]: deviceId }
    saveDevicePrefs(activeDeviceIds)
    await applyToRoom(kind, deviceId)
  }

  return {
    get devices() {
      return devices
    },
    get hasMic() {
      return hasMic
    },
    get hasCamera() {
      return hasCamera
    },
    get activeDeviceIds() {
      return activeDeviceIds
    },
    get settingsOpen() {
      return settingsOpen
    },
    setSettingsOpen(value: boolean) {
      settingsOpen = value
      if (value) {
        // Permission-prompting refresh so device labels are readable in
        // the dialog.
        void refresh(true)
      }
    },
    refresh,
    warnMissing,
    switchDevice
  }
}

export type ConferenceDevicesStore = ReturnType<
  typeof createConferenceDevicesStore
>
