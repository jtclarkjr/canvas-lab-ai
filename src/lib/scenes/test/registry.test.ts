import { describe, expect, it } from 'vite-plus/test'
import { getSceneType, isSceneTypeId, sceneTypes } from '$lib/scenes/registry'
import {
  documentCategories,
  getDocumentCategory
} from '$lib/scenes/document-categories'
import {
  defaultModelId,
  getModelOption,
  isPromptModelLimited,
  isPromptModelUnlimited,
  isKnownModelId,
  modelOptions
} from '$lib/scenes/models'

describe('scene type registry', () => {
  it('registers unique scene types with sane defaults', () => {
    const ids = sceneTypes.map((type) => type.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(isSceneTypeId('document')).toBe(true)
    expect(getSceneType('document')?.defaultSize.width).toBeGreaterThan(0)
    expect(getSceneType('unknown')).toBeNull()
  })
})

describe('document categories', () => {
  it('registers categories with at least one preset each', () => {
    expect(documentCategories.length).toBeGreaterThan(0)

    for (const category of documentCategories) {
      expect(category.presets.length).toBeGreaterThan(0)
    }

    expect(getDocumentCategory('claude-skill')?.docType).toBe('claude-skill')
    expect(getDocumentCategory('unknown')).toBeNull()
  })
})

describe('model catalog', () => {
  it('uses provider-prefixed ids and a known default', () => {
    for (const option of modelOptions) {
      expect(option.id.startsWith(`${option.provider}/`)).toBe(true)
      expect(['limited', 'unlimited']).toContain(option.usageTier)
    }

    expect(isKnownModelId(defaultModelId)).toBe(true)
    expect(getModelOption(defaultModelId)?.provider).toBe('openai')
  })

  it('limits every prompt model except nano', () => {
    for (const option of modelOptions) {
      if (option.id === 'openai/gpt-5.4-nano') {
        expect(isPromptModelUnlimited(option.id)).toBe(true)
        expect(isPromptModelLimited(option.id)).toBe(false)
      } else {
        expect(isPromptModelLimited(option.id)).toBe(true)
        expect(isPromptModelUnlimited(option.id)).toBe(false)
      }
    }
  })
})
