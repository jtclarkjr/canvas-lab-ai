export type WorkspaceElements = {
  rootEl: HTMLDivElement | null
  svgEl: SVGSVGElement | null
  textInputEl: HTMLTextAreaElement | null
}

export type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void
