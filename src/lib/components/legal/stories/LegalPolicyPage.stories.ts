import type { Meta, StoryObj } from '@storybook/sveltekit'
import { legalPolicies } from '$lib/legal/policies'
import LegalPolicyPage from '../LegalPolicyPage.svelte'

const meta = {
  title: 'Desktop/Legal/LegalPolicyPage',
  component: LegalPolicyPage,
  args: { policy: legalPolicies.termsOfService },
  tags: ['autodocs', 'visual'],
  parameters: { layout: 'fullscreen' }
} satisfies Meta<typeof LegalPolicyPage>

export default meta
type Story = StoryObj<typeof meta>

export const TermsOfService: Story = {}
export const PrivacyPolicy: Story = {
  args: { policy: legalPolicies.privacyPolicy }
}
