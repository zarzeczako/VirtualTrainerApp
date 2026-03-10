export type ExperienceOption = {
  value: string
  label: string
}

export const EXPERIENCE_LEVELS: ReadonlyArray<ExperienceOption> = [
  { value: 'beginner', label: 'Początkujący' },
  { value: 'intermediate', label: 'Średnio zaawansowany' },
  { value: 'advanced', label: 'Zaawansowany' },
] as const

const LABEL_MAP = EXPERIENCE_LEVELS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

export const getExperienceLabel = (value?: string | null): string | null => {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  return LABEL_MAP[normalized] ?? normalized
}
