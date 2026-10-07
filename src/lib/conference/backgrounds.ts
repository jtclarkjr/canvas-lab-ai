import type { BgPreset } from '#lib/conference/types.js'

function bucketUrl(filename: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base}/storage/v1/object/public/virtual-backgrounds/${filename}`
}

export const BG_PRESETS: BgPreset[] = [
  { id: 'none', label: 'None', type: 'none' },
  { id: 'blur', label: 'Blur', type: 'blur' },
  {
    id: 'office',
    label: 'Office',
    type: 'virtual',
    imagePath: bucketUrl('office.jpg')
  },
  {
    id: 'desk',
    label: 'Desk',
    type: 'virtual',
    imagePath: bucketUrl('desk.jpg')
  },
  {
    id: 'library',
    label: 'Library',
    type: 'virtual',
    imagePath: bucketUrl('library.jpg')
  },
  {
    id: 'cafe',
    label: 'Café',
    type: 'virtual',
    imagePath: bucketUrl('cafe.jpg')
  },
  {
    id: 'forest',
    label: 'Forest',
    type: 'virtual',
    imagePath: bucketUrl('forest.jpg')
  },
  {
    id: 'mountains',
    label: 'Mountains',
    type: 'virtual',
    imagePath: bucketUrl('mountains.jpg')
  }
]

export function bgThumbnailUrl(preset: BgPreset): string | null {
  if (preset.type !== 'virtual') return null
  return preset.imagePath
}
