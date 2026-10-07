<script lang="ts">
  import LegalPolicyPage from '#lib/components/legal/LegalPolicyPage.svelte'
  import { legalPolicies } from '#lib/legal/policies.js'

  const policy = legalPolicies.privacyPolicy
</script>

<svelte:head>
  <title>{policy.title}</title>
  <meta name="description" content={policy.description} />
</svelte:head>

<LegalPolicyPage {policy} />
