const levelLabels: Record<string, string> = {
  beginner: 'Początkujący',
  intermediate: 'Średniozaawansowany',
  advanced: 'Zaawansowany',
}

const levelAudienceLabels: Record<string, string> = {
  beginner: 'początkujących',
  intermediate: 'średniozaawansowanych',
  advanced: 'zaawansowanych',
}

const goalLabels: Record<string, string> = {
  calisthenics: 'Kalistenika',
  strength: 'Siła',
  hypertrophy: 'Masa Mięśniowa',
  general: 'Ogólna Sprawność',
}

const goalFocusLabels: Record<string, string> = {
  calisthenics: 'kalistenice',
  strength: 'budowaniu siły',
  hypertrophy: 'masie mięśniowej',
  general: 'ogólnej sprawności',
}

const equipmentLabels: Record<string, string> = {
  'body-weight': 'Własny Ciężar',
  'free-weight': 'Wolne Ciężary',
  gym: 'Pełna Siłownia',
}

export const getLevelLabel = (level: string) => levelLabels[level] ?? level

export const getLevelAudienceLabel = (level: string) => levelAudienceLabels[level] ?? level

export const getGoalLabel = (goal: string) => goalLabels[goal] ?? goal

export const getGoalFocusLabel = (goal: string) => goalFocusLabels[goal] ?? goal

export const getEquipmentLabel = (equipment: string) =>
  equipmentLabels[equipment] ?? equipment

export const buildDefaultPlanDescription = (
  days: number,
  goal: string,
  level: string,
) => {
  const daysPart = `Plan ${days}-dniowy`;
  const levelPart = getLevelAudienceLabel(level);
  const goalPart = getGoalFocusLabel(goal);
  const parts = [daysPart];

  if (levelPart) {
    parts.push(`dla ${levelPart}`);
  }

  if (goalPart) {
    parts.push(`skupiony na ${goalPart}`);
  }

  return `${parts.join(' ')}.`;
}
