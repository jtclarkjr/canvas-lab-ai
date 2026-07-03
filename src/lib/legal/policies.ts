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

export const legalPolicies = {
  termsOfService: {
    slug: 'terms-of-service',
    title: 'Canvas Lab Terms of Service',
    description:
      'Terms of Service for Canvas Lab, covering accounts, collaboration, user content, AI features, and service operation.',
    lastUpdated: 'June 29, 2026',
    sections: [
      {
        id: 'acceptance-and-scope',
        title: '1. Acceptance and Scope',
        paragraphs: [
          'These Terms of Service govern your access to and use of Canvas Lab, a real-time collaborative canvas service for creating, editing, sharing, discussing, and organizing canvas-based workspaces, documents, workflows, conference sessions, and related AI-assisted content.',
          'By accessing or using Canvas Lab, you agree to these Terms. If you do not agree, do not use the Service. If you use Canvas Lab on behalf of an organization, you represent that you have authority to bind that organization to these Terms.'
        ]
      },
      {
        id: 'accounts-and-authentication',
        title: '2. Accounts and Authentication',
        paragraphs: [
          'Canvas Lab uses Supabase Auth and optional third-party sign-in providers for account and session management. You are responsible for keeping your credentials secure and for all activity that occurs under your account.',
          "You must provide accurate account information and promptly update it when needed. You may not share accounts, impersonate another person, or use another user's credentials without permission."
        ]
      },
      {
        id: 'service-description',
        title: '3. Service Description',
        paragraphs: [
          'Canvas Lab provides collaborative drawing, text editing, document scenes, workflow scenes, chat, presence, sharing, access requests, and conference-related features. Some features may be experimental, may depend on third-party providers, or may change as the Service evolves.',
          'We may add, modify, limit, suspend, or discontinue features for security, reliability, maintenance, legal, or operational reasons.'
        ]
      },
      {
        id: 'user-content-and-canvas-data',
        title: '4. User Content and Canvas Data',
        paragraphs: [
          'You retain ownership of content you create or upload, including canvases, drawings, text, documents, workflow definitions, chat messages, prompts, files, feedback, and other materials. You grant Canvas Lab a limited license to host, store, transmit, process, display, reproduce, and modify your content only as needed to operate, secure, improve, and provide the Service.',
          'You are responsible for your content and for ensuring that you have the rights needed to submit it. Do not submit confidential, regulated, or sensitive information unless you are authorized to do so and the Service configuration is appropriate for that use.'
        ]
      },
      {
        id: 'ai-features-and-generated-output',
        title: '5. AI Features and Generated Output',
        paragraphs: [
          'Canvas Lab may include AI-assisted features for canvas assistance, document drafting, workflow assistance, captions, transcription, translation, or related tasks. AI features may send prompts, selected content, documents, audio, or metadata to configured AI providers such as OpenAI or Anthropic to generate responses or perform processing.',
          'AI output may be inaccurate, incomplete, offensive, or outdated. You are responsible for reviewing and validating AI output before relying on it, sharing it, or using it to make decisions. AI output is not professional, legal, medical, financial, or safety advice.'
        ]
      },
      {
        id: 'collaboration-sharing-and-permissions',
        title: '6. Collaboration, Sharing, and Permissions',
        paragraphs: [
          'Canvas Lab supports multi-user collaboration, live cursors, realtime updates, chat, role-based access, access requests, and shared canvas workspaces. You are responsible for choosing appropriate sharing settings and for managing who can view, edit, or interact with your canvases.',
          'If you invite others or share a canvas, their actions may affect shared content. Do not grant access to people who should not receive the information in that workspace.'
        ]
      },
      {
        id: 'usage-limits-availability-and-changes',
        title: '7. Usage Limits, Availability, and Changes',
        paragraphs: [
          'We may apply usage limits, rate limits, storage limits, feature limits, or other controls to protect service reliability, manage third-party provider costs, and prevent abuse. We do not guarantee that the Service will be uninterrupted, error-free, or available at all times.',
          'We may update these Terms by revising the Last Updated date. Continued use of Canvas Lab after an update means you accept the updated Terms.'
        ]
      },
      {
        id: 'prohibited-conduct',
        title: '8. Prohibited Conduct',
        bullets: [
          'Do not use the Service for unlawful, harmful, abusive, deceptive, harassing, hateful, violent, exploitative, infringing, or privacy-invasive activity.',
          "Do not upload or share content that violates another person's rights, exposes secrets or credentials, contains malware, or is intended to compromise systems or users.",
          'Do not attempt to probe, scan, overload, disrupt, reverse engineer, bypass, or abuse the Service, its APIs, its authentication, its realtime infrastructure, or its third-party providers.',
          'Do not use automated access, scraping, account creation, or high-volume requests in a way that harms reliability or avoids usage limits.',
          'Do not misrepresent AI output as human-authored where disclosure is required, or use AI features to generate content that violates these Terms or the Usage Policy.'
        ]
      },
      {
        id: 'suspension-and-termination',
        title: '9. Suspension and Termination',
        paragraphs: [
          'We may suspend, restrict, or terminate access to Canvas Lab if we reasonably believe you violated these Terms, created risk for the Service or other users, caused legal exposure, or used the Service abusively. You may stop using the Service at any time.',
          'After termination, some content may remain in backups, logs, shared workspaces, audit records, or retained records where permitted or required by law and operational needs.'
        ]
      },
      {
        id: 'disclaimers-and-liability',
        title: '10. Disclaimers and Liability',
        paragraphs: [
          'Canvas Lab is provided "as is" and "as available" without warranties of any kind to the fullest extent allowed by law. We disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, and reliability.',
          'To the fullest extent allowed by law, Canvas Lab and its operators will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenue, data, goodwill, or business opportunities.'
        ]
      },
      {
        id: 'governing-rules-and-contact',
        title: '11. Governing Rules and Contact',
        paragraphs: [
          "These Terms are governed by the laws that apply to the service operator and your use of the Service, without regard to conflict-of-law rules. Any required venue or dispute process will be determined by applicable law and the operator's published business terms when provided.",
          'Contact and support channels will be provided by the service operator or through the Service when available.'
        ]
      }
    ]
  },
  usagePolicy: {
    slug: 'usage-policy',
    title: 'Canvas Lab Usage Policy',
    description:
      'Usage Policy for Canvas Lab, covering permitted use, prohibited content, AI restrictions, collaboration rules, and enforcement.',
    lastUpdated: 'June 29, 2026',
    sections: [
      {
        id: 'scope',
        title: '1. Scope',
        paragraphs: [
          'This Usage Policy applies to all use of Canvas Lab, including canvases, drawings, text, documents, workflows, chat messages, uploaded content, prompts, AI-generated output, conference features, captions, translations, access requests, and API interactions.',
          'This policy is part of the Canvas Lab Terms of Service. If your use violates this policy, we may remove content, restrict features, suspend access, or take other action needed to protect users, the Service, or third-party providers.'
        ]
      },
      {
        id: 'allowed-use',
        title: '2. Allowed Use',
        paragraphs: [
          'You may use Canvas Lab for lawful collaboration, planning, drawing, drafting, note-taking, diagramming, workflow design, document editing, realtime communication, and AI-assisted productivity. You are responsible for your content and for how you share it.',
          'Use must comply with applicable law, the Terms of Service, this policy, provider policies for integrated services, and any access rules set by canvas owners or workspace collaborators.'
        ]
      },
      {
        id: 'prohibited-content-and-conduct',
        title: '3. Prohibited Content and Conduct',
        bullets: [
          'Illegal activity, instructions for committing crimes, or content that facilitates evasion of law enforcement or public safety systems.',
          'Abuse, harassment, threats, hate, exploitation, graphic violence, sexual exploitation, or content targeting people based on protected characteristics.',
          'Fraud, scams, phishing, spam, credential theft, impersonation, social engineering, or deceptive manipulation.',
          'Content that infringes intellectual property, violates privacy rights, exposes personal data without authorization, or reveals confidential information you are not allowed to share.',
          'Malware, exploit code, vulnerability abuse, denial-of-service activity, credential stuffing, unauthorized scanning, or attempts to compromise systems or accounts.'
        ]
      },
      {
        id: 'ai-feature-restrictions',
        title: '4. AI Feature Restrictions',
        paragraphs: [
          'Do not use Canvas Lab AI features to generate, transform, conceal, or distribute prohibited content. Do not rely on AI output as a substitute for professional judgment in legal, medical, financial, safety-critical, employment, housing, credit, education, or similar high-impact decisions.',
          'Do not submit content to AI features unless you have the right to process that content through the configured providers. You are responsible for reviewing AI output before using, publishing, or sharing it.'
        ],
        bullets: [
          'Do not use AI features to create malware, phishing, credential theft, spam, surveillance abuse, or instructions for unauthorized access.',
          'Do not use AI features to impersonate others, mislead people about source or authorship, or generate deceptive content at scale.',
          'Do not use AI features to infer sensitive traits or make consequential decisions about people without lawful authority and appropriate safeguards.'
        ]
      },
      {
        id: 'collaboration-and-sharing-rules',
        title: '5. Collaboration and Sharing Rules',
        paragraphs: [
          'Canvas owners and editors are responsible for managing access. Before inviting collaborators, sharing a canvas, or granting edit access, confirm that recipients are authorized to see and modify the workspace content.',
          'Do not use collaboration features to harass users, flood workspaces, overwrite content maliciously, bypass access controls, or trick users into disclosing information.'
        ]
      },
      {
        id: 'security-and-system-abuse',
        title: '6. Security and System Abuse',
        bullets: [
          'Do not bypass authentication, authorization, rate limits, storage limits, usage controls, billing controls, or feature restrictions.',
          'Do not interfere with realtime synchronization, presence, chat, API routes, databases, storage, conference features, or third-party provider integrations.',
          'Do not use bots, scripts, or automated traffic in a way that degrades reliability, causes excessive cost, or avoids intended product limits.',
          'Do not test security vulnerabilities except through an authorized channel and only in a way that avoids harm to users and data.'
        ]
      },
      {
        id: 'usage-limits-and-enforcement',
        title: '7. Usage Limits and Enforcement',
        paragraphs: [
          'Canvas Lab may enforce usage limits, rate limits, moderation controls, logging, provider restrictions, or access restrictions to protect reliability and safety. Limits may vary by environment, account, feature, or operational need.',
          'We may investigate suspected violations using account, usage, content, request, and security data available to the Service. Enforcement may include warnings, content removal, feature limits, temporary suspension, account termination, or reporting where legally required.'
        ]
      },
      {
        id: 'reporting-issues',
        title: '8. Reporting Issues',
        paragraphs: [
          'If you encounter harmful content, security issues, abuse, or policy violations, use the contact or support channel provided by the service operator or through Canvas Lab when available. Include enough detail to identify the relevant account, canvas, message, workflow, or request.'
        ]
      }
    ]
  },
  privacyPolicy: {
    slug: 'privacy-policy',
    title: 'Canvas Lab Privacy Policy',
    description:
      'Privacy Policy explaining what data Canvas Lab collects, how it is used, how AI and realtime features process data, and what choices users have.',
    lastUpdated: 'June 29, 2026',
    sections: [
      {
        id: 'who-we-are',
        title: '1. Who We Are',
        paragraphs: [
          'This Privacy Policy explains how Canvas Lab collects, uses, shares, and retains personal data when you access or use the Service. Canvas Lab is a real-time collaborative canvas application built with SvelteKit, Supabase, and optional AI and conference integrations.',
          'For purposes of this policy, "personal data" means information that identifies, relates to, describes, or can reasonably be associated with an individual.'
        ]
      },
      {
        id: 'data-we-collect',
        title: '2. Data We Collect',
        bullets: [
          'Account and authentication data, such as account identifiers, email address, display name, avatar metadata, OAuth provider metadata, session identifiers, and authentication events.',
          'Canvas and workspace data, such as canvas titles, drawing elements, text elements, document scenes, workflow scenes, access roles, access requests, sharing state, timestamps, and collaborator activity.',
          'Communication and AI data, such as chat messages, assistant messages, prompts, uploaded or selected context, generated output, feedback, captions, transcription text, translation requests, and related metadata.',
          'Technical and usage data, such as IP address, browser type, device identifiers, operating system, request identifiers, feature usage, logs, diagnostics, errors, security signals, and performance data.',
          'Preference and local state data, such as theme settings, UI preferences, session tokens, local browser storage, and settings needed to operate the Service.'
        ]
      },
      {
        id: 'how-we-use-data',
        title: '3. How We Use Data',
        bullets: [
          'Provide, operate, maintain, secure, and improve Canvas Lab.',
          'Authenticate users, manage sessions, enforce roles, and support sharing and access requests.',
          'Synchronize canvases, chat, presence, collaboration state, scenes, documents, workflows, and conference-related features.',
          'Provide AI-assisted features, generate responses, process prompts and context, transcribe or translate content, and enforce usage limits.',
          'Detect, prevent, investigate, and respond to abuse, security incidents, fraud, service errors, policy violations, and legal obligations.',
          'Communicate about the Service, respond to support requests, and provide notices about changes or incidents when a contact channel is available.'
        ]
      },
      {
        id: 'ai-realtime-and-conference-processing',
        title: '4. AI, Realtime, and Conference Processing',
        paragraphs: [
          'Canvas Lab may process canvas content, chat messages, documents, workflow definitions, prompts, selected context, audio, captions, or translations through configured third-party providers. These providers may include Supabase for authentication, database, storage, and realtime features, and AI providers such as OpenAI or Anthropic for model-based features.',
          'When conference captions or translation features are enabled, audio or transcript data may be processed by the configured provider to provide the requested feature. Do not enable or use these features for conversations unless you have the rights and notices required by applicable law.'
        ]
      },
      {
        id: 'data-sharing-and-service-providers',
        title: '5. Data Sharing and Service Providers',
        bullets: [
          'Infrastructure, hosting, database, authentication, realtime, storage, analytics, monitoring, and security providers needed to operate the Service.',
          'AI, transcription, translation, or model providers when you use features that require those providers.',
          'Other collaborators and viewers according to the permissions, sharing settings, and roles applied to a canvas or workspace.',
          'Law enforcement, regulators, courts, or other parties when required by law, legal process, protection of rights, security, or safety.',
          'Successors or administrators in connection with a reorganization, transfer, merger, financing, or similar business transaction involving the Service.'
        ]
      },
      {
        id: 'cookies-tokens-and-local-storage',
        title: '6. Cookies, Tokens, and Local Storage',
        paragraphs: [
          'Canvas Lab may use cookies, authentication tokens, and local browser storage to manage sessions, remember preferences, secure requests, maintain realtime connections, and support product functionality. You can clear browser data through your browser settings, but doing so may sign you out or reset preferences.'
        ]
      },
      {
        id: 'retention-and-deletion',
        title: '7. Retention and Deletion',
        paragraphs: [
          'We retain personal data as long as needed to provide the Service, maintain security and backups, comply with legal obligations, resolve disputes, enforce agreements, and support legitimate operational needs.',
          'Deletion requests may be limited where data is required for security, legal compliance, backups, shared collaboration records, audit logs, or the rights of other users. Shared content may remain visible to collaborators who still have access unless removed from the shared workspace.'
        ]
      },
      {
        id: 'security',
        title: '8. Security',
        paragraphs: [
          'We use reasonable technical and organizational safeguards designed to protect personal data, including access controls, authentication, encryption in transit, provider security controls, and operational monitoring. No online service can guarantee absolute security.'
        ]
      },
      {
        id: 'your-rights-and-choices',
        title: '9. Your Rights and Choices',
        bullets: [
          'Access, review, or export personal data where supported by the Service or required by law.',
          'Correct inaccurate account or profile information where available.',
          'Request deletion or restriction of personal data where permitted by law and compatible with service operation.',
          'Object to certain processing or withdraw consent where applicable.',
          'Manage browser cookies, local storage, and notification permissions through your browser or device settings.'
        ]
      },
      {
        id: 'children',
        title: '10. Children',
        paragraphs: [
          'Canvas Lab is not intended for children under 13 or the higher minimum age required by applicable law. Do not use the Service if you are below the required age. If we learn that a child has provided personal data without appropriate consent, we will take steps to delete it where required.'
        ]
      },
      {
        id: 'changes-to-this-policy',
        title: '11. Changes to This Policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time. When we make changes, we will update the Last Updated date. Continued use of Canvas Lab after changes means the updated policy applies to your use of the Service.'
        ]
      },
      {
        id: 'contact',
        title: '12. Contact',
        paragraphs: [
          'Contact and support channels will be provided by the service operator or through the Service when available.'
        ]
      }
    ]
  }
} satisfies Record<string, LegalPolicy>
