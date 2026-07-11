import { describe, expect, it } from 'vite-plus/test'
import { parseGeneratedCallSummary } from './call-summary'

describe('parseGeneratedCallSummary', () => {
  it('parses a structured summary wrapped in a JSON fence', () => {
    expect(
      parseGeneratedCallSummary(`\`\`\`json
{
  "title": "Transcript reliability review",
  "overview": "The call reviewed transcript processing and a summary-first result.",
  "keyPoints": ["Group adjacent speech into turns"],
  "decisions": ["Use LiveKit Inference for summaries"],
  "actionItems": [{ "text": "Deploy the updated worker", "owner": "James" }]
}
\`\`\``)
    ).toEqual({
      title: 'Transcript reliability review',
      overview:
        'The call reviewed transcript processing and a summary-first result.',
      keyPoints: ['Group adjacent speech into turns'],
      decisions: ['Use LiveKit Inference for summaries'],
      actionItems: [{ text: 'Deploy the updated worker', owner: 'James' }]
    })
  })

  it('fills optional summary lists and owners with stable defaults', () => {
    expect(
      parseGeneratedCallSummary(
        '{"title":"Short call","overview":"A short update.","actionItems":[{"text":"Follow up"}]}'
      )
    ).toEqual({
      title: 'Short call',
      overview: 'A short update.',
      keyPoints: [],
      decisions: [],
      actionItems: [{ text: 'Follow up', owner: null }]
    })
  })

  it('rejects prose instead of silently storing an unusable summary', () => {
    expect(() => parseGeneratedCallSummary('This was a useful call.')).toThrow(
      'JSON object'
    )
  })
})
