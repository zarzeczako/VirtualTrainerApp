import { describe, expect, it } from 'vitest';
import {
  buildExerciseCatalog,
  defaultExerciseSuggestions,
  getExerciseSuggestions,
} from '../ProgressPage.helpers';

describe('ProgressPage helpers', () => {
  it('filters to Polish names and drops body-weight equipment', () => {
    const catalog = buildExerciseCatalog([
      { name_pl: 'Wyciskanie sztangi', equipment: 'barbell' },
      { name_pl: 'Pompki', equipment: 'body weight' },
      { name_pl: 'Przysiad ze sztangą', equipment: 'Barbell' },
      { name_pl: 'Martwy ciąg ze sztangą', equipment: 'barbell' },
    ]);

    expect(catalog).toEqual([
      'Martwy ciąg ze sztangą',
      'Przysiad ze sztangą',
      'Wyciskanie sztangi',
    ]);
  });

  it('returns curated defaults first when query is empty', () => {
    const catalog = [
      'Wyciskanie sztangi',
      'Martwy ciąg ze sztangą',
      'Przysiad ze sztangą',
      'Uginanie sztangi',
      'Wyciskanie hantli',
      'Dodatkowe ćwiczenie',
    ];

    const suggestions = getExerciseSuggestions(catalog, '', defaultExerciseSuggestions);

    expect(suggestions.slice(0, 5)).toEqual([
      'Wyciskanie sztangi',
      'Martwy ciąg ze sztangą',
      'Wyciskanie hantli',
      'Przysiad ze sztangą',
      'Uginanie sztangi',
    ]);
  });

  it('matches by normalized prefix and includes infix matches as fallback', () => {
    const catalog = [
      'Wyciskanie sztangi',
      'Martwy ciąg ze sztangą',
      'Unoszenie hantli bokiem',
      'Przysiad ze sztangą',
      'Uginanie sztangi',
    ];

    const suggestions = getExerciseSuggestions(catalog, 'hantli', defaultExerciseSuggestions);

    expect(suggestions).toContain('Unoszenie hantli bokiem');
    expect(suggestions).not.toContain('Wyciskanie sztangi');
  });
});
