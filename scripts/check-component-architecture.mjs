import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const libRoot = path.join(projectRoot, 'src/lib')
const uiRoot = path.join(libRoot, 'components/ui')
const sharedRoot = path.join(libRoot, 'components/shared')
const componentRoots = [
  path.join(libRoot, 'components'),
  path.join(libRoot, 'mobile/components')
]
const coveredFeatureRoots = [
  {
    root: path.join(libRoot, 'components/auth'),
    titlePrefix: 'Desktop/Auth/'
  },
  {
    root: path.join(libRoot, 'components/settings'),
    titlePrefix: 'Desktop/Settings/'
  },
  {
    root: path.join(libRoot, 'components/legal'),
    titlePrefix: 'Desktop/Legal/'
  },
  {
    root: path.join(libRoot, 'components/canvas/home'),
    titlePrefix: 'Desktop/Canvas/Home/'
  },
  {
    root: path.join(libRoot, 'components/canvas/chat'),
    titlePrefix: 'Desktop/Canvas/Chat/'
  },
  {
    root: path.join(libRoot, 'mobile/components/chat'),
    titlePrefix: 'Mobile/Canvas/Chat/'
  },
  {
    root: path.join(libRoot, 'mobile/components/navigation'),
    titlePrefix: 'Mobile/Canvas/Navigation/'
  },
  {
    root: path.join(libRoot, 'mobile/components/share'),
    titlePrefix: 'Mobile/Canvas/Share/'
  },
  {
    root: path.join(libRoot, 'mobile/components/toolbars'),
    titlePrefix: 'Mobile/Canvas/Toolbars/'
  },
  {
    root: path.join(libRoot, 'mobile/components/conference'),
    titlePrefix: 'Mobile/Canvas/Conference/'
  },
  {
    root: path.join(libRoot, 'mobile/components/scenes'),
    titlePrefix: 'Mobile/Canvas/Scenes/'
  },
  {
    root: path.join(libRoot, 'mobile/components/workflows'),
    titlePrefix: 'Mobile/Canvas/Workflows/'
  },
  {
    root: path.join(libRoot, 'mobile/components/workspace'),
    titlePrefix: 'Mobile/Canvas/Workspace/'
  },
  {
    root: path.join(libRoot, 'components/canvas/scenes'),
    titlePrefix: 'Desktop/Canvas/Scenes/'
  },
  {
    root: path.join(libRoot, 'components/canvas/scenes/document'),
    titlePrefix: 'Desktop/Canvas/Scenes/Document/'
  },
  {
    root: path.join(libRoot, 'components/canvas/scenes/notes'),
    titlePrefix: 'Desktop/Canvas/Scenes/Notes/'
  },
  {
    root: path.join(libRoot, 'components/canvas/workflows'),
    titlePrefix: 'Desktop/Canvas/Workflows/'
  },
  {
    root: path.join(libRoot, 'components/canvas/workflows/database'),
    titlePrefix: 'Desktop/Canvas/Workflows/Database/'
  },
  {
    root: path.join(libRoot, 'components/canvas/workflows/panels'),
    titlePrefix: 'Desktop/Canvas/Workflows/Panels/'
  },
  {
    root: path.join(libRoot, 'components/canvas/conference'),
    titlePrefix: 'Desktop/Canvas/Conference/'
  },
  {
    root: path.join(libRoot, 'components/canvas/conference/controls'),
    titlePrefix: 'Desktop/Canvas/Conference/Controls/'
  },
  {
    root: path.join(libRoot, 'components/canvas/conference/layout'),
    titlePrefix: 'Desktop/Canvas/Conference/Layout/'
  },
  {
    root: path.join(libRoot, 'components/canvas/conference/tiles'),
    titlePrefix: 'Desktop/Canvas/Conference/Tiles/'
  },
  {
    root: path.join(libRoot, 'components/canvas/workspace'),
    titlePrefix: 'Desktop/Canvas/Workspace/'
  },
  {
    root: path.join(libRoot, 'components/canvas/workspace/toolbars'),
    titlePrefix: 'Desktop/Canvas/Workspace/Toolbars/'
  },
  {
    root: path.join(libRoot, 'components/canvas'),
    titlePrefix: 'Desktop/Canvas/'
  }
]
const errors = []

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(absolute)))
    else files.push(absolute)
  }
  return files
}

const libFiles = await walk(libRoot)
const sourceFiles = libFiles.filter((file) => /\.(svelte|ts)$/.test(file))
const sourceFileSet = new Set(sourceFiles)
const productionComponents = sourceFiles.filter(
  (file) =>
    file.endsWith('.svelte') && !file.includes(`${path.sep}stories${path.sep}`)
)
const storyFiles = sourceFiles.filter((file) => file.endsWith('.stories.ts'))
const storyFileSet = new Set(storyFiles)
const guardedComponents = productionComponents.filter((file) =>
  componentRoots.some((root) => file.startsWith(`${root}${path.sep}`))
)

const sharedDomains = new Set(
  productionComponents
    .filter((file) => file.startsWith(`${sharedRoot}${path.sep}`))
    .map((file) => path.relative(sharedRoot, file).split(path.sep)[0])
)

for (const domain of sharedDomains) {
  const domainBarrel = path.join(sharedRoot, domain, 'index.ts')
  if (!sourceFileSet.has(domainBarrel)) {
    errors.push(
      `${path.relative(projectRoot, domainBarrel)}: shared domain requires a public index.ts barrel`
    )
  }
}

for (const component of guardedComponents) {
  const name = path.basename(component, '.svelte')
  let layeredRoot = null
  if (component.startsWith(`${uiRoot}${path.sep}`)) layeredRoot = uiRoot
  else if (component.startsWith(`${sharedRoot}${path.sep}`))
    layeredRoot = sharedRoot
  const expectedStory = layeredRoot
    ? path.join(
        layeredRoot,
        'stories',
        path.relative(layeredRoot, path.dirname(component)),
        `${name}.stories.ts`
      )
    : path.join(path.dirname(component), 'stories', `${name}.stories.ts`)
  if (!storyFileSet.has(expectedStory)) {
    errors.push(
      `${path.relative(projectRoot, component)}: missing exact story ${path.relative(projectRoot, expectedStory)}`
    )
  } else {
    const storyContent = await readFile(expectedStory, 'utf8')
    if (!/['"]visual['"]/.test(storyContent)) {
      errors.push(
        `${path.relative(projectRoot, expectedStory)}: component story requires at least one visual state`
      )
    }
  }
}

for (const file of sourceFiles) {
  const relative = path.relative(projectRoot, file)
  const content = await readFile(file, 'utf8')
  const insideUi = file.startsWith(`${uiRoot}${path.sep}`)
  const insideShared = file.startsWith(`${sharedRoot}${path.sep}`)

  if (!insideUi && /from\s+['"]bits-ui['"]/.test(content)) {
    errors.push(`${relative}: bits-ui may only be imported by /components/ui`)
  }

  if (!insideUi && /from\s+['"]\$lib\/components\/ui\//.test(content)) {
    errors.push(
      `${relative}: cross-layer UI imports must use $lib/components/ui`
    )
  }

  if (/from\s+['"]\$lib\/components\/shared\/[^/'"]+\//.test(content)) {
    errors.push(
      `${relative}: shared component imports must use a domain index.ts barrel`
    )
  }

  if (insideUi && !file.includes(`${path.sep}stories${path.sep}`)) {
    const forbidden = [
      '$lib/components/shared',
      '$lib/stores',
      '$lib/canvas',
      '$lib/mobile',
      '$lib/workspace',
      '$lib/server',
      '$lib/auth'
    ]
    for (const specifier of forbidden) {
      if (content.includes(specifier)) {
        errors.push(`${relative}: /ui cannot import ${specifier}`)
      }
    }
  }

  if (insideShared && !file.includes(`${path.sep}stories${path.sep}`)) {
    const forbidden = [
      '$lib/components/auth',
      '$lib/components/canvas',
      '$lib/mobile',
      '$lib/workspace',
      '$lib/routes'
    ]
    for (const specifier of forbidden) {
      if (content.includes(specifier)) {
        errors.push(`${relative}: /shared cannot import ${specifier}`)
      }
    }
  }
}

const uiComponents = productionComponents.filter((file) =>
  file.startsWith(`${uiRoot}${path.sep}`)
)

const sharedComponents = productionComponents.filter((file) =>
  file.startsWith(`${sharedRoot}${path.sep}`)
)

for (const story of storyFiles.filter((file) => file.startsWith(uiRoot))) {
  const content = await readFile(story, 'utf8')
  if (!/title:\s*['"]UI\//.test(content)) {
    errors.push(
      `${path.relative(projectRoot, story)}: story title must start with UI/`
    )
  }
}

for (const story of storyFiles.filter((file) => file.startsWith(sharedRoot))) {
  const content = await readFile(story, 'utf8')
  if (!/title:\s*['"]Shared\//.test(content)) {
    errors.push(
      `${path.relative(projectRoot, story)}: story title must start with Shared/`
    )
  }
}

for (const feature of coveredFeatureRoots) {
  const featureStories = storyFiles.filter(
    (file) => path.dirname(file) === path.join(feature.root, 'stories')
  )

  for (const story of featureStories) {
    const content = await readFile(story, 'utf8')
    if (!content.includes(`title: '${feature.titlePrefix}`)) {
      errors.push(
        `${path.relative(projectRoot, story)}: story title must start with ${feature.titlePrefix}`
      )
    }
  }
}

if (errors.length > 0) {
  console.error(`Component architecture check failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Component architecture check passed: ${guardedComponents.length} components (${uiComponents.length} UI, ${sharedComponents.length} shared) and ${coveredFeatureRoots.length} feature sections enforce exact stories`
)
