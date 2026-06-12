import type { DocumentCategory } from '$lib/scenes/types'

// Document workflow categories. Adding a category is additive: append an
// entry here and add its system prompt in
// src/lib/server/ai/prompts/document-presets.ts.
export const documentCategories: DocumentCategory[] = [
  {
    id: 'doc-md',
    label: 'Document (.md)',
    description: 'General markdown documents: READMEs, guides, specs.',
    docType: 'markdown-doc',
    presets: [
      {
        id: 'readme',
        label: 'Project README',
        prompt:
          'Create a README.md for my project. Ask me for the project name, what it does, and how to run it if I have not told you yet.'
      },
      {
        id: 'tech-spec',
        label: 'Technical spec',
        prompt:
          'Draft a technical specification document. Include overview, goals, non-goals, proposed design, and open questions.'
      },
      {
        id: 'guide',
        label: 'How-to guide',
        prompt:
          'Write a step-by-step how-to guide. Keep steps numbered, include prerequisites, and add a troubleshooting section.'
      }
    ]
  },
  {
    id: 'claude-skill',
    label: 'Claude skill (SKILL.md)',
    description: 'Agent skills with frontmatter, triggers, and workflow.',
    docType: 'claude-skill',
    presets: [
      {
        id: 'new-skill',
        label: 'Create a skill',
        prompt:
          'Create a SKILL.md for a new Claude skill. Ask me what the skill should do, then draft it with proper frontmatter (name, description), trigger guidance, and step-by-step instructions.'
      },
      {
        id: 'skill-from-workflow',
        label: 'Skill from my workflow',
        prompt:
          'I will describe a workflow I do repeatedly. Turn it into a reusable SKILL.md with frontmatter, when-to-use triggers, and concrete steps.'
      }
    ]
  }
]

export function getDocumentCategory(id: string): DocumentCategory | null {
  return documentCategories.find((category) => category.id === id) ?? null
}
