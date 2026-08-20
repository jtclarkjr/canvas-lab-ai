export const crossBrowserVisualStories = {
  ui: [
    'ui-actions-button--default',
    'ui-feedback-skeleton--default',
    'ui-forms-input--invalid',
    'ui-layout-card--selected',
    'ui-navigation-segmentedcontrol--default',
    'ui-overlays-bottomsheet--open',
    'ui-overlays-dialog--open',
    'ui-overlays-drawer--open',
    'ui-overlays-popover--open'
  ],
  shared: [
    'shared-chat-chatcomposer--compact',
    'shared-chat-chatloadingskeleton--desktop',
    'shared-collections-virtualizedmessagelist--default',
    'shared-feedback-confirmdialog--open',
    'shared-identity-avatar--initials'
  ],
  desktop: [
    'desktop-auth-authform--default',
    'desktop-canvas-chat-canvaschat--default',
    'desktop-canvas-conference-layout-conferencefullscreen--default',
    'desktop-canvas-home-canvashome--default',
    'desktop-canvas-scenes-document-documentscenepanel--default',
    'desktop-canvas-workflows-workflowgraph--default',
    'desktop-canvas-workspace-canvasworkspace--default',
    'desktop-settings-settingsdialog--general'
  ],
  mobile: [
    'mobile-canvas-chat-mobilecanvaschat--default',
    'mobile-canvas-conference-mobileconferencefullscreen--default',
    'mobile-canvas-workflows-mobileworkflowgraph--default',
    'mobile-canvas-workspace-mobilecanvasworkspace--default'
  ]
} as const

export const crossBrowserVisualStoryIds = Object.values(
  crossBrowserVisualStories
).flat()
