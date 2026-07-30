export type LegalPolicySection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export type LegalPolicy = {
  slug: string
  title: string
  description: string
  lastUpdated: string
  sections: LegalPolicySection[]
}
