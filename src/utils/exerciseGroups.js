// Strength exercises that only differ in where the lift starts ("Vending fra
// heng" / "Vending fra bakken") are shown as one exercise on the progression
// page, with the variant in parentheses.

const VARIANT_RE =
  /^(.*?)\s*(?:\(\s*(?:fra\s+)?(heng|hang|bakken|gulv(?:et)?)\s*\)|[-–,]?\s*fra\s+(heng|hang|bakken|gulv(?:et)?))\s*$/i

export function splitVariant(name) {
  const trimmed = name.trim()
  const match = VARIANT_RE.exec(trimmed)
  if (!match || !match[1].trim()) return { base: trimmed, variant: null }
  return { base: match[1].trim(), variant: (match[2] || match[3]).toLowerCase() }
}

// Returns [{ key, label, ids, variants }] sorted by label. `variants` maps an
// exercise id to its variant text (or null). A name only counts as a variant
// when at least two exercises share the same base name; otherwise the exercise
// keeps its full name.
export function groupStrengthExercises(exercises) {
  const byBase = new Map()
  for (const exercise of exercises) {
    const { base, variant } = splitVariant(exercise.name)
    const key = base.toLowerCase()
    if (!byBase.has(key)) byBase.set(key, [])
    byBase.get(key).push({ exercise, base, variant })
  }

  const groups = []
  for (const [key, members] of byBase) {
    const merged = members.length > 1 && members.some((m) => m.variant)
    if (merged) {
      groups.push({
        key,
        label: members[0].base,
        ids: members.map((m) => m.exercise.id),
        variants: new Map(members.map((m) => [m.exercise.id, m.variant])),
      })
    } else {
      for (const m of members) {
        groups.push({
          key: m.exercise.id,
          label: m.exercise.name,
          ids: [m.exercise.id],
          variants: new Map([[m.exercise.id, null]]),
        })
      }
    }
  }
  return groups.sort((a, b) => a.label.localeCompare(b.label, 'nb'))
}
