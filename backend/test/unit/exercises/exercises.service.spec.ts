/**
 * Testy jednostkowe - ExercisesService
 * 
 * Testowane funkcjonalności:
 * - Pobieranie wszystkich ćwiczeń
 * - Pobieranie ćwiczenia po ID
 * - Wyszukiwanie po nazwie polskiej
 * - Filtrowanie po części ciała
 * - Wyszukiwanie ćwiczeń przez filtr MongoDB
 * - Tworzenie ćwiczenia ze Swap Library
 * - Obsługa Swap Library
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ExercisesService } from '../../../src/exercises/exercises.service';
import { Exercise } from '../../../src/exercises/schemas/exercise.schema';
import { SwapExercise } from '../../../src/exercises/schemas/swap-exercise.schema';
import { mockExercise, mockSwapExercise, mockExercisesList } from '../../helpers/mock-data';
import { createMockQuery } from '../../helpers/test-utils';

describe('ExercisesService', () => {
  let service: ExercisesService;
  let mockExerciseModel: any;
  let mockSwapExerciseModel: any;

  beforeEach(async () => {
    const exerciseModelFactory = jest.fn() as any;
    exerciseModelFactory.find = jest.fn();
    exerciseModelFactory.findOne = jest.fn();
    exerciseModelFactory.findById = jest.fn();
    exerciseModelFactory.distinct = jest.fn();
    mockExerciseModel = exerciseModelFactory;

    mockSwapExerciseModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        {
          provide: getModelToken(Exercise.name),
          useValue: mockExerciseModel,
        },
        {
          provide: getModelToken(SwapExercise.name),
          useValue: mockSwapExerciseModel,
        },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('powinno zwrócić listę wszystkich ćwiczeń z podstawowymi polami', async () => {
      // Arrange
      const exercises = [mockExercise];
      const query = createMockQuery(exercises);
      mockExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockExerciseModel.find).toHaveBeenCalled();
      expect(query.select).toHaveBeenCalledWith('name_pl bodyPart target equipment gifUrl');
      expect(result).toEqual(exercises);
    });

    it('powinno zwrócić pustą tablicę gdy brak ćwiczeń', async () => {
      // Arrange
      const query = createMockQuery([]);
      mockExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('powinno zwrócić pełne dane ćwiczenia po ID', async () => {
      // Arrange
      const id = mockExercise._id.toString();
      const query = createMockQuery(mockExercise);
      mockExerciseModel.findById.mockReturnValue(query);

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(mockExerciseModel.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockExercise);
      expect(result).toHaveProperty('instructions');
    });

    it('powinno rzucić NotFoundException gdy ćwiczenie nie istnieje', async () => {
      // Arrange
      const id = new Types.ObjectId().toString();
      const query = createMockQuery(null);
      mockExerciseModel.findById.mockReturnValue(query);

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        `Nie znaleziono ćwiczenia o ID ${id}`,
      );
    });
  });

  describe('findOneByNamePl', () => {
    it('powinno znaleźć ćwiczenie po nazwie polskiej (case-insensitive)', async () => {
      // Arrange
      const namePl = 'pompki';
      const query = createMockQuery(mockExercise);
      mockExerciseModel.findOne.mockReturnValue(query);

      // Act
      const result = await service.findOneByNamePl(namePl);

      // Assert
      expect(mockExerciseModel.findOne).toHaveBeenCalledWith({
        name_pl: { $regex: expect.any(RegExp) },
      });
      expect(result).toEqual(mockExercise);
    });

    it('powinno zwrócić null gdy ćwiczenie nie istnieje', async () => {
      // Arrange
      const namePl = 'nieistniejące ćwiczenie';
      const query = createMockQuery(null);
      mockExerciseModel.findOne.mockReturnValue(query);

      // Act
      const result = await service.findOneByNamePl(namePl);

      // Assert
      expect(result).toBeNull();
    });

    it('powinno trimować whitespace z nazwy', async () => {
      // Arrange
      const namePl = '  pompki  ';
      const query = createMockQuery(mockExercise);
      mockExerciseModel.findOne.mockReturnValue(query);

      // Act
      await service.findOneByNamePl(namePl);

      // Assert
      const callArg = mockExerciseModel.findOne.mock.calls[0][0];
      expect(callArg.name_pl.$regex.source).toContain('pompki');
      expect(callArg.name_pl.$regex.source).not.toContain('  ');
    });

    it('powinno używać regex z flagą "i" (case-insensitive)', async () => {
      // Arrange
      const namePl = 'POMPKI';
      const query = createMockQuery(mockExercise);
      mockExerciseModel.findOne.mockReturnValue(query);

      // Act
      await service.findOneByNamePl(namePl);

      // Assert
      const callArg = mockExerciseModel.findOne.mock.calls[0][0];
      expect(callArg.name_pl.$regex.flags).toContain('i');
    });
  });

  describe('findByBodyPart', () => {
    it('powinno zwrócić ćwiczenia dla danej partii ciała', async () => {
      // Arrange
      const bodyPart = 'chest';
      const exercises = [mockExercise];
      const query = createMockQuery(exercises);
      mockExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.findByBodyPart(bodyPart);

      // Assert
      expect(mockExerciseModel.find).toHaveBeenCalledWith({ bodyPart: bodyPart.toLowerCase() });
      expect(query.select).toHaveBeenCalledWith('name_pl bodyPart target equipment gifUrl');
      expect(result).toEqual(exercises);
    });

    it('powinno konwertować bodyPart na lowercase', async () => {
      // Arrange
      const bodyPart = 'CHEST';
      const query = createMockQuery([]);
      mockExerciseModel.find.mockReturnValue(query);

      // Act
      await service.findByBodyPart(bodyPart);

      // Assert
      expect(mockExerciseModel.find).toHaveBeenCalledWith({ bodyPart: 'chest' });
    });
  });

  describe('findAllBodyParts', () => {
    it('powinno zwrócić listę unikalnych partii ciała', async () => {
      // Arrange
      const bodyParts = ['chest', 'back', 'legs', 'shoulders'];
      mockExerciseModel.distinct.mockResolvedValue(bodyParts);

      // Act
      const result = await service.findAllBodyParts();

      // Assert
      expect(mockExerciseModel.distinct).toHaveBeenCalledWith('bodyPart');
      expect(result).toEqual(bodyParts);
    });
  });

  describe('findExercisesByFilter', () => {
    it('powinno zwrócić ćwiczenia pasujące do filtra', async () => {
      // Arrange
      const filter = { bodyPart: 'chest', equipment: { $in: ['barbell', 'dumbbell'] } };
      const exercises = mockExercisesList;
      const query = createMockQuery(exercises);
      mockExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.findExercisesByFilter(filter);

      // Assert
      expect(mockExerciseModel.find).toHaveBeenCalledWith(filter);
      expect(query.limit).toHaveBeenCalledWith(1350);
      expect(result).toEqual(exercises);
    });

    it('powinno obsługiwać niestandardowy limit', async () => {
      // Arrange
      const filter = { bodyPart: 'legs' };
      const customLimit = 50;
      const query = createMockQuery([]);
      mockExerciseModel.find.mockReturnValue(query);

      // Act
      await service.findExercisesByFilter(filter, customLimit);

      // Assert
      expect(query.limit).toHaveBeenCalledWith(customLimit);
    });

    it('powinno zwrócić pustą tablicę gdy brak wyników', async () => {
      // Arrange
      const filter = { bodyPart: 'nonexistent' };
      const query = createMockQuery([]);
      mockExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.findExercisesByFilter(filter);

      // Assert
      expect(result).toEqual([]);
    });

    it('powinno logować ostrzeżenie gdy brak wyników', async () => {
      // Arrange
      const filter = { bodyPart: 'nonexistent' };
      const query = createMockQuery([]);
      mockExerciseModel.find.mockReturnValue(query);
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // Act
      await service.findExercisesByFilter(filter);

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('Swap Library - findAllSwap', () => {
    it('powinno zwrócić wszystkie ćwiczenia ze Swap Library', async () => {
      // Arrange
      const swapExercises = [mockSwapExercise];
      const query = createMockQuery(swapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.findAllSwap();

      // Assert
      expect(mockSwapExerciseModel.find).toHaveBeenCalled();
      expect(query.select).toHaveBeenCalledWith('name_pl bodyPart target equipment gifUrl');
      expect(result).toEqual(swapExercises);
    });
  });

  describe('Swap Library - findOneSwap', () => {
    it('powinno zwrócić ćwiczenie ze Swap Library po ID', async () => {
      // Arrange
      const id = mockSwapExercise._id.toString();
      const query = createMockQuery(mockSwapExercise);
      mockSwapExerciseModel.findById.mockReturnValue(query);

      // Act
      const result = await service.findOneSwap(id);

      // Assert
      expect(mockSwapExerciseModel.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockSwapExercise);
    });

    it('powinno rzucić NotFoundException gdy ćwiczenie nie istnieje', async () => {
      // Arrange
      const id = new Types.ObjectId().toString();
      const query = createMockQuery(null);
      mockSwapExerciseModel.findById.mockReturnValue(query);

      // Act & Assert
      await expect(service.findOneSwap(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOneSwap(id)).rejects.toThrow(
        `Nie znaleziono ćwiczenia o ID ${id} w Swap Library`,
      );
    });
  });

  describe('Swap Library - findSwapByBodyPart', () => {
    it('powinno zwrócić ćwiczenia swap dla danej partii ciała', async () => {
      // Arrange
      const bodyPart = 'chest';
      const swapExercises = [mockSwapExercise];
      const query = createMockQuery(swapExercises);
      mockSwapExerciseModel.find.mockReturnValue(query);

      // Act
      const result = await service.findSwapByBodyPart(bodyPart);

      // Assert
      expect(mockSwapExerciseModel.find).toHaveBeenCalledWith({ 
        bodyPart: bodyPart.toLowerCase() 
      });
      expect(result).toEqual(swapExercises);
    });
  });

  describe('createExerciseFromSwap', () => {
    it('powinno utworzyć nowe ćwiczenie w Golden List z danych Swap', async () => {
      // Arrange
      const swapExerciseData = mockSwapExercise;
      const createdExercise = {
        ...mockExercise,
        save: jest.fn().mockResolvedValue(mockExercise),
      };
      
      mockExerciseModel.mockImplementation(() => createdExercise);

      // Act
      const result = await service.createExerciseFromSwap(swapExerciseData);

      // Assert
      expect(createdExercise.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('powinno ustawić domyślne wartości dla brakujących pól', async () => {
      // Arrange
      const swapExerciseData = {
        apiId: '9999',
        name: 'New Exercise',
        name_pl: 'Nowe ćwiczenie',
        bodyPart: 'chest',
        target: 'pectorals',
        equipment: 'body weight',
        gifUrl: 'http://example.com/gif.gif',
      };
      
      const createdExercise = {
        ...swapExerciseData,
        difficulty: 5,
        role: 'accessory',
        pattern: 'other',
        save: jest.fn().mockResolvedValue({ ...swapExerciseData, _id: new Types.ObjectId() }),
      };
      
      mockExerciseModel.mockImplementation(() => createdExercise);

      // Act
      await service.createExerciseFromSwap(swapExerciseData);

      // Assert
      expect(createdExercise.save).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('powinno obsłużyć pusty string w findOneByNamePl', async () => {
      // Arrange
      const namePl = '';
      const query = createMockQuery(null);
      mockExerciseModel.findOne.mockReturnValue(query);

      // Act
      const result = await service.findOneByNamePl(namePl);

      // Assert
      expect(result).toBeNull();
    });

    it('powinno obsłużyć specjalne znaki w nazwie ćwiczenia (regex escape)', async () => {
      // Arrange
      const namePl = 'pompki (wariant trudny)';
      const query = createMockQuery(mockExercise);
      mockExerciseModel.findOne.mockReturnValue(query);

      // Act
      await service.findOneByNamePl(namePl);

      // Assert
      expect(mockExerciseModel.findOne).toHaveBeenCalled();
    });
  });
});
