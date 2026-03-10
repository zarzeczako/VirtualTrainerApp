export type ExerciseCatalogItem = { name_pl?: string; equipment?: string };

export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

export const defaultExerciseSuggestions = [
  'Wyciskanie sztangi',
  'Martwy ciąg ze sztangą',
  'Wyciskanie hantli',
  'Przysiad ze sztangą',
  'Uginanie sztangi',
];

export const buildExerciseCatalog = (
  items: ExerciseCatalogItem[],
  normalizeFn: (value: string) => string = normalizeText,
): string[] => {
  const unique = new Set<string>();
  items.forEach((item) => {
    const equipment = normalizeFn(item.equipment ?? '');
    if (equipment === 'body weight') return;
    const namePl = item.name_pl?.trim();
    if (namePl) unique.add(namePl);
  });
  return Array.from(unique).sort();
};

export const getExerciseSuggestions = (
  catalog: string[],
  query: string,
  defaults: string[],
  normalizeFn: (value: string) => string = normalizeText,
): string[] => {
  if (!query.trim()) {
    const catalogSet = new Set(catalog);
    const curated = defaults.filter((name) => catalogSet.has(name));
    if (curated.length >= 5) return curated.slice(0, 5);
    return [...curated, ...catalog].slice(0, 5);
  }

  const normalizedQuery = normalizeFn(query);
  const matches: string[] = [];

  for (const name of catalog) {
    const normalized = normalizeFn(name);
    if (normalized.startsWith(normalizedQuery)) {
      matches.push(name);
    }
    if (matches.length >= 5) break;
  }

  if (matches.length < 5) {
    for (const name of catalog) {
      const normalized = normalizeFn(name);
      if (!normalized.startsWith(normalizedQuery) && normalized.includes(normalizedQuery)) {
        matches.push(name);
      }
      if (matches.length >= 5) break;
    }
  }

  return matches;
};
