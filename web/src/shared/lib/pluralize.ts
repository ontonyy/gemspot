/* Count-aware nouns — "1 spot" / "3 spots". Keep every rendered count on
   these so no card ever ships "1 SPOTS" again. */
export function pluralNoun(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${pluralNoun(count, singular, plural)}`
}
