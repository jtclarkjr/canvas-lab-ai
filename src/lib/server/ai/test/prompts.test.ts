import { describe, expect, it } from 'vite-plus/test'
import { buildCanvasAssistantPrompt } from '#lib/server/ai/prompts/canvas-assistant.js'
import { buildDocumentSystemPrompt } from '#lib/server/ai/prompts/document-presets.js'
import { getWorkflowFlowTypeDefinition } from '#lib/workflows/flow-types.js'

describe('AI prompt composition', () => {
  it('builds the canvas assistant prompt from markdown and context titles', () => {
    const prompt = buildCanvasAssistantPrompt({
      contextDocuments: [
        {
          id: 'doc-1',
          title: 'Launch notes'
        }
      ]
    })

    expect(prompt).toContain('# Canvas Assistant')
    expect(prompt).toContain('web_search tool')
    expect(prompt).toContain('- doc-1: "Launch notes"')
    expect(prompt).toContain('read_context_document tool')
  })

  it('builds the document prompt from base, category, active document, and context blocks', () => {
    const prompt = buildDocumentSystemPrompt({
      category: 'claude-skill',
      activeDocument: {
        title: 'Draft skill',
        markdown: '# Current Draft'
      },
      contextDocuments: [
        {
          id: 'doc-2',
          title: 'Source material',
          sceneTitle: 'Research',
          source: 'linked-scene'
        }
      ]
    })

    expect(prompt).toContain('# Document Drafting Assistant')
    expect(prompt).toContain('# Claude Agent Skill')
    expect(prompt).toContain(
      'existing document titled "Draft skill". Current content:'
    )
    expect(prompt).toContain(
      '<current_document>\n# Current Draft\n</current_document>'
    )
    expect(prompt).toContain(
      '- doc-2: "Source material" from connected scene "Research"'
    )
  })

  it('omits category-specific document guidance for unknown categories', () => {
    const prompt = buildDocumentSystemPrompt({
      category: 'unknown',
      activeDocument: null,
      contextDocuments: []
    })

    expect(prompt).toContain('# Document Drafting Assistant')
    expect(prompt).not.toContain('# General Markdown Document')
    expect(prompt).not.toContain('# Claude Agent Skill')
  })

  it('exposes workflow assistant prompts from markdown-backed flow definitions', () => {
    const workflow = getWorkflowFlowTypeDefinition('workflow')
    const database = getWorkflowFlowTypeDefinition('database')

    expect(workflow.assistant.system).toContain('# Workflow Proposal Assistant')
    expect(workflow.assistant.finalInstruction).toContain(
      '# Workflow Proposal Final Instruction'
    )
    expect(database.assistant.system).toContain('# Database Proposal Assistant')
    expect(database.assistant.finalInstruction).toContain(
      '# Database Proposal Final Instruction'
    )
  })
})
