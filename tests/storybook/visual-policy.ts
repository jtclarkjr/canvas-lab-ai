export const crossBrowserVisualStories = {
  ui: [
    'ui-actions-button--default',
    'ui-forms-input--invalid',
    'ui-overlays-dialog--open',
    'ui-overlays-popover--open'
  ],
  shared: [
    'shared-chat-chatcomposer--compact',
    'shared-collections-virtualizedmessagelist--default',
    'shared-feedback-confirmdialog--open'
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
