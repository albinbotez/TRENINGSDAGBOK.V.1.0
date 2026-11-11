// Strength exercises that only differ in where the lift starts ("Vending fra
// heng" / "Vending fra bakken") are shown as one exercise on the progression
// page, with the variant in parentheses.

const VARIANT = '(heng|hang|bakken|gulv(?:et)?)'
const VARIANT_RE = new RegExp(
  `^(.*?)(?:\\s*\\(\\s*(?:fra\\s+)?${VARIANT}\\s*\\)|\\s*[-–,]\\s*(?:fra\\s+)?${VARIANT}|\\s+(?:fra\\s+)?${VARIANT})\\s*$`,
  'i'
)

// Different spellings of the same lift.
const ALIASES = { frivending: 'vending' }

const ANYWHERE_RE = new RegExp(`(?:^|[^\\p{L}])${VARIANT}(?![\\p{L}])`, 'iu')

export function splitVariant(name) {
  const trimmed = name.trim()
  // Any vending (frivending, vending, …) with heng/bakken somewhere in the
  // name counts as the same lift, whatever the exact wording.
  if (/vending/i.test(trimmed)) {
    const found = ANYWHERE_RE.exec(trimmed)
    if (found) return { base: 'Vending', variant: found[1].toLowerCase() }
  }
  const match = VARIANT_RE.exec(trimmed)
  if (!match || !match[1].trim()) return { base: trimmed, variant: null }
  return { base: match[1].trim(), variant: (match[2] || match[3] || match[4]).toLowerCase() }
}

function baseKey(base) {
  const lower = base.toLowerCase()
  return ALIASES[lower] || lower
}

// Returns [{ key, label, ids, variants }] sorted by label. `variants` maps an
// exercise id to its variant text (or null). A name only counts as a variant
// when at least two exercises share the same base name; otherwise the exercise
// keeps its full name.
export function groupStrengthExercises(exercises) {
  const byBase = new Map()
  for (const exercise of exercises) {
    const { base, variant } = splitVariant(exercise.name)
    const key = baseKey(base)
    if (!byBase.has(key)) byBase.set(key, [])
    byBase.get(key).push({ exercise, base, variant })
  }

  const groups = []
  for (const [key, members] of byBase) {
    const merged = members.length > 1 && members.some((m) => m.variant)
    if (merged) {
      groups.push({
        key,
        label: (members.find((m) => m.base.toLowerCase() === key) || members[0]).base,
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
