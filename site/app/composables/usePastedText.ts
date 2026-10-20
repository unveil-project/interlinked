export interface PastedText {
  markdown: string
  template: string
  source?: Source
}

/** Text pasted or picked from the examples, kept for the move to `/analyze`. */
export function usePastedText() {
  return useState<PastedText | undefined>('pasted', () => undefined)
}
