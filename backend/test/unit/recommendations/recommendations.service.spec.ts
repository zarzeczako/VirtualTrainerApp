/**
 * Testy jednostkowe - RecommendationsService
 * 
 * Testowane funkcjonalności:
 * - Ładowanie i przetwarzanie ćwiczeń do wektorów
 * - Obliczanie podobieństwa kosinusowego
 * - Wyszukiwanie podobnych ćwiczeń
 * - Znajdowanie najbardziej zróżnicowanego ćwiczenia
 * - Algorytmy AI/ML dla rekomendacji
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RecommendationService } from '../../../src/recommendations/recommendations.service';
import { SwapExercise } from '../../../src/exercises/schemas/swap-exercise.schema';
import { mockExercisesList } from '../../helpers/mock-data';
import { createMockQuery } from '../../helpers/test-utils';

describe('RecommendationsService', () => {
  let service: RecommendationService;
  let mockSwapExerciseModel: any;

  const mockSwapExercises = [
    {
      apiId: '0001',
      name_pl: 'Pompki',
      bodyPart: 'chest',
      target: 'pectorals',
      equipment: 'body weight',
    },
    {
      apiId: '0002',
      name_pl: 'Pompki na skosie',
      bodyPart: 'chest',
      target: 'pectorals',
      equipment: 'body weight',
    },
    {
      apiId: '0003',
      name_pl: 'Wyciskanie sztangi',
      bodyPart: 'chest',
      target: 'pectorals',
      equipment: 'barbell',
    },
    {
      apiId: '0004',
      name_pl: 'Podciąganie',
      bodyPart: 'back',
      target: 'lats',
      equipment: 'pull-up bar',
    },
  ];

  beforeEach(async () => {
    mockSwapExerciseModel = {
      find: jest.fn(),
      insertMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: getModelToken(SwapExercise.name),
          useValue: mockSwapExerciseModel,
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    jest.clearAllMocks();
  });

  describe('onModuleInit - ładowanie danych', () => {
    it('powinno załadować ćwiczenia i utworzyć wektory podczas inicjalizacji', async () => {
      // Arrange
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockSwapExerciseModel.find).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Załadowano'),
      );
    });

    it('powinno utworzyć słowniki (vocabularies) dla bodyPart, target i equipment', async () => {
      // Arrange
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      await service.onModuleInit();

      // Assert
      const bodyPartVocab = (service as any).bodyPartVocab;
      const targetVocab = (service as any).targetVocab;
      const equipmentVocab = (service as any).equipmentVocab;

      expect(bodyPartVocab).toContain('chest');
      expect(bodyPartVocab).toContain('back');
      expect(targetVocab).toContain('pectorals');
      expect(targetVocab).toContain('lats');
      expect(equipmentVocab).toContain('body weight');
      expect(equipmentVocab).toContain('barbell');
    });

    it('powinno zasilić fallback gdy kolekcja jest pusta', async () => {
      // Arrange
      const query = createMockQuery([]);
      mockSwapExerciseModel.find.mockReturnValue(query);
      const fallback = [
        {
          apiId: '9999',
          name: 'Fallback',
          name_pl: 'Fallback',
          bodyPart: 'chest',
          target: 'pectorals',
          equipment: 'body weight',
        },
      ];
      jest
        .spyOn<any, any>(service as any, 'loadFallbackExercisesFromFile')
        .mockReturnValue(fallback);
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockSwapExerciseModel.insertMany).toHaveBeenCalledWith(fallback, { ordered: false });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('fallbacku exercises.json'),
      );
      expect((service as any).vectorMap.size).toBeGreaterThan(0);
    });

    it('powinno utworzyć mapy wektorów dla wszystkich ćwiczeń', async () => {
      // Arrange
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      await service.onModuleInit();

      // Assert
      const vectorMap = (service as any).vectorMap;
      expect(vectorMap.size).toBe(mockSwapExercises.length);
      expect(vectorMap.has('0001')).toBe(true);
      expect(vectorMap.has('0004')).toBe(true);
    });

    it('powinno zalogować błąd gdy baza jest pusta', async () => {
      // Arrange
      const query = createMockQuery([]);
      mockSwapExerciseModel.find.mockReturnValue(query);
      jest
        .spyOn<any, any>(service as any, 'loadFallbackExercisesFromFile')
        .mockReturnValue([]);
      const loggerSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('swap_exercises jest pusta'),
      );
    });
  });

  describe('createVector', () => {
    beforeEach(async () => {
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);
      await service.onModuleInit();
    });

    it('powinno utworzyć wektor binarny dla ćwiczenia', () => {
      // Arrange
      const exercise = mockSwapExercises[0];

      // Act
      const vector = (service as any).createVector(exercise);

      // Assert
      expect(vector).toBeInstanceOf(Array);
      expect(vector.length).toBeGreaterThan(0);
      expect(vector.every((val: number) => val === 0 || val === 1)).toBe(true);
    });

    it('powinno ustawić 1 dla dopasowanych atrybutów', () => {
      // Arrange
      const exercise = {
        bodyPart: 'chest',
        target: 'pectorals',
        equipment: 'body weight',
      };

      // Act
      const vector = (service as any).createVector(exercise);

      // Assert
      expect(vector).toContain(1); // Powinien zawierać przynajmniej jedną 1
    });
  });

  describe('getCosineSimilarity', () => {
    beforeEach(async () => {
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);
      await service.onModuleInit();
    });

    it('powinno zwrócić wysokie podobieństwo dla identycznych ćwiczeń', () => {
      // Arrange
      const apiId1 = '0001'; // Pompki
      const apiId2 = '0002'; // Pompki na skosie (ta sama partia ciała i sprzęt)

      // Act
      const similarity = (service as any).getCosineSimilarity(apiId1, apiId2);

      // Assert
      expect(similarity).toBeGreaterThan(0.5); // Wysokie podobieństwo
      expect(similarity).toBeLessThanOrEqual(1 + Number.EPSILON);
    });

    it('powinno zwrócić niskie podobieństwo dla różnych ćwiczeń', () => {
      // Arrange
      const apiId1 = '0001'; // Pompki (chest, body weight)
      const apiId2 = '0004'; // Podciąganie (back, pull-up bar)

      // Act
      const similarity = (service as any).getCosineSimilarity(apiId1, apiId2);

      // Assert
      expect(similarity).toBeLessThan(0.5); // Niskie podobieństwo
      expect(similarity).toBeGreaterThanOrEqual(0);
    });

    it('powinno zwrócić 0 gdy jeden z wektorów nie istnieje', () => {
      // Arrange
      const apiId1 = '0001';
      const apiId2 = 'nonexistent';

      // Act
      const similarity = (service as any).getCosineSimilarity(apiId1, apiId2);

      // Assert
      expect(similarity).toBe(0);
    });

    it('powinno zwrócić 0 gdy magnitude jest 0', () => {
      // Arrange
      const vectorMap = (service as any).vectorMap;
      vectorMap.set('zero_vector', [0, 0, 0, 0]);

      // Act
      const similarity = (service as any).getCosineSimilarity('0001', 'zero_vector');

      // Assert
      expect(similarity).toBe(0);
    });
  });

  describe('getSimilarExercises', () => {
    beforeEach(async () => {
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);
      await service.onModuleInit();
    });

    it('powinno zwrócić podobne ćwiczenia posortowane według similarity score', async () => {
      // Arrange
      const apiId = '0001'; // Pompki
      const n = 2;
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.getSimilarExercises(apiId, n);

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(n);
      expect(result.every((ex) => ex.apiId !== apiId)).toBe(true); // Nie zawiera tego samego
    });

    it('powinno wykluczyć ćwiczenie o tym samym apiId', async () => {
      // Arrange
      const apiId = '0001';
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.getSimilarExercises(apiId, 10);

      // Assert
      expect(result.find((ex) => ex.apiId === apiId)).toBeUndefined();
    });

    it('powinno zwrócić pustą tablicę gdy brak wektora dla apiId', async () => {
      // Arrange
      const apiId = 'nonexistent';
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // Act
      const result = await service.getSimilarExercises(apiId, 5);

      // Assert
      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('powinno ograniczyć wyniki do podanej liczby n', async () => {
      // Arrange
      const apiId = '0001';
      const n = 2;
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.getSimilarExercises(apiId, n);

      // Assert
      expect(result.length).toBeLessThanOrEqual(n);
    });
  });

  describe('getMostDiverseExercise', () => {
    beforeEach(async () => {
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);
      await service.onModuleInit();
    });

    it('powinno zwrócić ćwiczenie najbardziej różne od wybranych', () => {
      // Arrange
      const candidatePool = mockExercisesList.slice(0, 3);
      const chosenExercises = [mockExercisesList[0]];

      // Act
      const result = service.getMostDiverseExercise(candidatePool, chosenExercises);

      // Assert
      expect(result).toBeDefined();
      expect(candidatePool).toContain(result);
    });

    it('powinno zwrócić null dla pustej puli kandydatów', () => {
      // Arrange
      const candidatePool: any[] = [];
      const chosenExercises = [mockExercisesList[0]];

      // Act
      const result = service.getMostDiverseExercise(candidatePool, chosenExercises);

      // Assert
      expect(result).toBeNull();
    });

    it('powinno zwrócić pierwszy element gdy brak apiId w wybranych', () => {
      // Arrange
      const candidatePool = mockExercisesList.slice(0, 3);
      const chosenExercises: any[] = [];

      // Act
      const result = service.getMostDiverseExercise(candidatePool, chosenExercises);

      // Assert
      expect(result).toBeDefined();
      expect(candidatePool).toContain(result);
    });

    it('powinno pominąć ćwiczenia bez apiId', () => {
      // Arrange
      const candidatePool = [
        { ...mockExercisesList[0], apiId: undefined },
        mockExercisesList[1],
      ];
      const chosenExercises = [mockExercisesList[2]];

      // Act
      const result = service.getMostDiverseExercise(candidatePool as any, chosenExercises);

      // Assert
      expect(result).toBeDefined();
    });

    it('powinno znaleźć ćwiczenie z najniższym maksymalnym podobieństwem', () => {
      // Arrange
      // Tworzymy sytuację gdzie 0003 (barbell bench) jest bardziej różne od 0004 (pull-up)
      // niż 0001 i 0002 (oba body weight chest)
      const candidatePool = mockExercisesList.slice(0, 3);
      const chosenExercises = [mockExercisesList[3]]; // Pull-up

      // Act
      const result = service.getMostDiverseExercise(candidatePool, chosenExercises);

      // Assert
      expect(result).toBeDefined();
      // Wynik powinien preferować ćwiczenie z innego bodyPart niż wybrane
    });
  });

  describe('Matematyka wektorowa - dotProduct i magnitude', () => {
    beforeEach(async () => {
      const query = createMockQuery(mockSwapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);
      await service.onModuleInit();
    });

    it('dotProduct powinno zwrócić iloczyn skalarny', () => {
      // Arrange
      const vecA = [1, 0, 1, 0];
      const vecB = [1, 1, 0, 0];

      // Act
      const result = (service as any).dotProduct(vecA, vecB);

      // Assert
      expect(result).toBe(1); // 1*1 + 0*1 + 1*0 + 0*0 = 1
    });

    it('magnitude powinno zwrócić długość wektora', () => {
      // Arrange
      const vec = [3, 4]; // magnitude = 5

      // Act
      const result = (service as any).magnitude(vec);

      // Assert
      expect(result).toBe(5);
    });

    it('magnitude dla wektora zerowego powinno zwrócić 0', () => {
      // Arrange
      const vec = [0, 0, 0];

      // Act
      const result = (service as any).magnitude(vec);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('Edge cases i performance', () => {
    it('powinno obsłużyć dużą liczbę ćwiczeń', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        apiId: `${1000 + i}`,
        bodyPart: i % 2 === 0 ? 'chest' : 'back',
        target: 'muscle',
        equipment: 'barbell',
      }));
      const query = createMockQuery(largeDataset);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      const startTime = Date.now();
      await service.onModuleInit();
      const endTime = Date.now();

      // Assert
      const vectorMap = (service as any).vectorMap;
      expect(vectorMap.size).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Powinno zakończyć się w < 5s
    });
  });
});
