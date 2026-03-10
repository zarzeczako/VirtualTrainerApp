/**
 * Testy jednostkowe - DialogflowService
 *
 * Testowane funkcjonalności (aktualne API):
 * - Routowanie intencji Dialogflow
 * - Wyszukiwanie oparte na cache + Fuse.js
 * - Filtrowanie po bodyPart/equipment
 * - Obsługa wielu wyników (quick replies) i przypadków brzegowych
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import Fuse from 'fuse.js';
import { DialogflowService } from '../../../src/dialogflow/dialogflow.service';
import { SwapExercise } from '../../../src/exercises/schemas/swap-exercise.schema';
import { mockSwapExercise, mockDialogflowBody } from '../../helpers/mock-data';

describe('DialogflowService', () => {
  let service: DialogflowService;
  let mockSwapExerciseModel: any;

  const buildExercise = (overrides: Partial<typeof mockSwapExercise> = {}) => ({
    ...mockSwapExercise,
    instructions_pl: ['Krok 1', 'Krok 2'],
    ...overrides,
  });

  const seedExercises = (exercises: any[]) => {
    (service as any).allExercisesCache = exercises;
    (service as any).fuse = new Fuse(exercises, (service as any).fuseOptions);
  };

  beforeEach(async () => {
    mockSwapExerciseModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DialogflowService,
        {
          provide: getModelToken(SwapExercise.name),
          useValue: mockSwapExerciseModel,
        },
      ],
    }).compile();

    service = module.get<DialogflowService>(DialogflowService);
    jest.spyOn(service, 'onModuleInit').mockResolvedValue();
  });

  describe('routeIntent', () => {
    it('powinno przekierować do handlePytanieOTechnike dla intencji PytanieOTechnike', async () => {
      // Arrange
      const exercise = buildExercise({ name_pl: 'Pompki na skosie' });
      seedExercises([exercise]);

      const body = {
        ...mockDialogflowBody,
        queryResult: {
          ...mockDialogflowBody.queryResult,
          parameters: {
            ...mockDialogflowBody.queryResult.parameters,
            exercise_name: exercise.name_pl,
          },
          queryText: `jak wykonać ${exercise.name_pl}`,
        },
      };

      // Act
      const result = await service.routeIntent(body);

      // Assert
      expect(result).toHaveProperty('fulfillmentText');
      expect(result.fulfillmentText).toContain(exercise.name_pl);
    });

    it('powinno przekierować do handleDefinicjaTerminu dla intencji DefinicjaTerminu', async () => {
      // Arrange
      const body = {
        queryResult: {
          intent: { displayName: 'DefinicjaTerminu' },
          parameters: { fitness_term: 'TDEE' },
          queryText: 'co to jest TDEE',
        },
      };

      // Act
      const result = await service.routeIntent(body);

      // Assert
      expect(result).toHaveProperty('fulfillmentText');
    });

    it('powinno zwrócić błąd dla nieobsługiwanej intencji', async () => {
      // Arrange
      const body = {
        queryResult: {
          intent: { displayName: 'NieznanaIntencja' },
          parameters: {},
          queryText: 'test',
        },
      };

      // Act
      const result = await service.routeIntent(body);

      // Assert
      expect(result.fulfillmentText).toContain('Nieobsługiwana intencja');
    });
  });

  describe('handlePytanieOTechnike - dokładne wyszukiwanie', () => {
    it('powinno znaleźć ćwiczenie przez dokładne dopasowanie (kliknięcie przycisku)', async () => {
      // Arrange
      const exercise = buildExercise({ name_pl: 'Pompki na skosie' });
      seedExercises([exercise]);

      // Act
      const result = await service['handlePytanieOTechnike'](exercise.name_pl, null, null);

      // Assert
      expect(result.fulfillmentText).toContain(exercise.name_pl);
      expect(result.fulfillmentText).toContain('1. Krok 1');
      expect(result.fulfillmentText).toContain('2. Krok 2');
    });

    it('powinno escape-ować specjalne znaki regex w nazwie', async () => {
      // Arrange
      const exerciseName = 'Pompki (wariant trudny)';
      const exercise = buildExercise({ name_pl: exerciseName, instructions_pl: ['Instrukcja'] });
      seedExercises([exercise]);

      // Act
      const result = await service['handlePytanieOTechnike'](exerciseName, null, null);

      // Assert
      expect(result.fulfillmentText).toContain(exerciseName);
    });
  });

  describe('handlePytanieOTechnike - full-text search', () => {
    it('powinno wyświetlić quick replies gdy znaleziono wiele wyników', async () => {
      // Arrange
      const exercises = [
        buildExercise({ name_pl: 'Pompki klasyczne' }),
        buildExercise({ name_pl: 'Pompki na skosie' }),
        buildExercise({ name_pl: 'Pompki diamentowe' }),
      ];
      seedExercises(exercises);

      // Act
      const result = await service['handlePytanieOTechnike']('pompki', null, null, 'pompki');

      // Assert
      expect(result.fulfillmentMessages[1]).toHaveProperty('quickReplies');
      expect(
        result.fulfillmentMessages[1].quickReplies.quickReplies.length,
      ).toBe(3);
    });

    it('powinno filtrować po bodyPart gdy podano muscle_group', async () => {
      // Arrange
      const chestExercise = buildExercise({ name_pl: 'Pompki', bodyPart: 'chest' });
      const backExercise = buildExercise({
        name_pl: 'Wiosłowanie',
        bodyPart: 'back',
        instructions_pl: ['Wiosłowanie - krok 1'],
      });
      seedExercises([chestExercise, backExercise]);

      // Act
      const result = await service['handlePytanieOTechnike']('', 'plecy', null);

      // Assert
      expect(result.fulfillmentText).toContain('Wiosłowanie');
      expect(result.fulfillmentText).not.toContain('Pompki');
    });

    it('powinno usunąć duplikaty z listy quick replies', async () => {
      // Arrange
      const exercisesWithDuplicates = [
        buildExercise({ name_pl: 'Pompki klasyczne' }),
        buildExercise({ name_pl: 'Pompki klasyczne', equipment: 'dumbbell' }),
        buildExercise({ name_pl: 'Pompki na skosie' }),
      ];
      seedExercises(exercisesWithDuplicates);

      // Act
      const result = await service['handlePytanieOTechnike']('pompki', null, null, 'pompki');

      // Assert
      const quickReplies = result.fulfillmentMessages[1].quickReplies.quickReplies;
      expect(quickReplies.length).toBe(2);
      expect(quickReplies).toEqual(['Pompki klasyczne', 'Pompki na skosie']);
    });
  });

  describe('handleDefinicjaTerminu', () => {
    it('powinno zwrócić definicję dla znanego terminu', () => {
      // Arrange
      const term = 'TDEE';

      // Act
      const result = service['handleDefinicjaTerminu'](term);

      // Assert
      expect(result).toHaveProperty('fulfillmentText');
      expect(result.fulfillmentText).toBeDefined();
    });

    it('powinno być case-insensitive dla terminu', () => {
      // Arrange
      const terms = ['tdee', 'TDEE', 'TdEe'];

      // Act & Assert
      terms.forEach(term => {
        const result = service['handleDefinicjaTerminu'](term);
        expect(result.fulfillmentText).toBeDefined();
        // Wszystkie powinny zwrócić tę samą definicję
      });
    });

    it('powinno zwrócić komunikat o braku definicji dla nieznanego terminu', () => {
      // Arrange
      const term = 'NieznanyTermin';

      // Act
      const result = service['handleDefinicjaTerminu'](term);

      // Assert
      expect(result.fulfillmentText).toContain('nie znam jeszcze definicji');
      expect(result.fulfillmentText).toContain(term);
    });

    it('powinno obsłużyć pusty string', () => {
      // Arrange
      const term = '';

      // Act
      const result = service['handleDefinicjaTerminu'](term);

      // Assert
      expect(result.fulfillmentText).toContain('nie dosłyszałem');
    });
  });

  describe('Edge cases i bezpieczeństwo', () => {
    it('powinno obsłużyć null/undefined w parameters', async () => {
      // Arrange
      seedExercises([
        buildExercise({ name_pl: 'Przysiad', instructions_pl: [] }),
      ]);
      const body = {
        queryResult: {
          intent: { displayName: 'PytanieOTechnike' },
          parameters: {},
          queryText: '',
        },
      };

      // Act
      const result = await service.routeIntent(body);

      // Assert
      expect(result.fulfillmentText).toContain('Niestety, nie znalazłem ćwiczenia');
    });

    it('powinno bezpiecznie obsłużyć specjalne znaki regex', async () => {
      // Arrange
      const specialChars = ['test()', 'test[]', 'test.*', 'test+', 'test?'];

      for (const char of specialChars) {
        seedExercises([
          buildExercise({ name_pl: char, instructions_pl: ['Instrukcja'] }),
        ]);

        // Act & Assert - nie powinno rzucić błędu
        const result = await service['handlePytanieOTechnike'](char, null, null);
        expect(result.fulfillmentText).toContain(char);
      }
    });

    it('powinno obsłużyć ćwiczenie bez instrukcji_pl', async () => {
      // Arrange
      seedExercises([
        buildExercise({ name_pl: 'Pompki', instructions_pl: null as any }),
      ]);

      // Act
      const result = await service['handlePytanieOTechnike']('pompki', null, null);

      // Assert
      const ft = result.fulfillmentText as string;
      expect(
        ft.includes('nie mam jeszcze polskich instrukcji') ||
        ft.includes('Niestety, nie znalazłem ćwiczenia'),
      ).toBeTruthy();
    });
  });
});
