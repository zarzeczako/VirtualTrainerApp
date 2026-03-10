/**
 * Testy jednostkowe - UsersService
 * 
 * Testowane funkcjonalności:
 * - Pobieranie wszystkich użytkowników (bez hasła)
 * - Wyszukiwanie użytkownika po ID
 * - Bezpieczne wyszukiwanie po ID
 * - Wyszukiwanie po email (z hasłem)
 * - Tworzenie nowego użytkownika
 * - Ustawianie hasła użytkownika
 * - Obsługa nieprawidłowych ObjectId
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from '../../../src/users/users.service';
import { User } from '../../../src/users/schema/user.schema';
import { mockUser, mockUserWithoutPassword } from '../../helpers/mock-data';
import { createMockQuery } from '../../helpers/test-utils';

const PROFILE_BASELINE = Object.freeze({
  firstName: 'Michał',
  lastName: 'Rogowski',
  city: 'Warszawa',
  goal: 'Przygotowanie do półmaratonu i budowa siły funkcjonalnej',
  experienceLevel: 'Średniozaawansowany',
  weightKg: 82,
  heightCm: 184,
  workoutsPerWeekTarget: 4,
  themePreference: 'sunset',
  avatarUrl:
    'https://api.dicebear.com/7.x/notionists/svg?background=F8C77E&seed=Michal',
  avatarBackground: '#F8C77E',
  bio: 'Analityk danych, który łączy bieganie z treningiem siłowym i regeneracją.',
  birthDate: new Date('1993-03-12T00:00:00.000Z'),
});

const mergeWithProfileDefaults = <T extends Record<string, any>>(user: T) => ({
  ...PROFILE_BASELINE,
  ...user,
});

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('powinno zwrócić listę użytkowników bez hasła', async () => {
      // Arrange
      const users = [mockUserWithoutPassword];
      const query = createMockQuery(users);
      mockUserModel.find.mockReturnValue(query);
      const expectedUsers = [mockUserWithoutPassword];

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockUserModel.find).toHaveBeenCalled();
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(query.lean).toHaveBeenCalled();
      expect(result).toEqual(expectedUsers);
    });

    it('powinno zwrócić pustą tablicę gdy brak użytkowników', async () => {
      // Arrange
      const query = createMockQuery([]);
      mockUserModel.find.mockReturnValue(query);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('powinno zwrócić użytkownika po prawidłowym ID (bez hasła)', async () => {
      // Arrange
      const validId = mockUser._id.toString();
      const query = createMockQuery(mockUserWithoutPassword);
      mockUserModel.findById.mockReturnValue(query);
      const expectedUser = mockUserWithoutPassword;

      // Act
      const result = await service.findOne(validId);

      // Assert
      expect(mockUserModel.findById).toHaveBeenCalledWith(validId);
      expect(query.select).toHaveBeenCalledWith('-password');
      expect(result).toEqual(expectedUser);
      expect(result).not.toHaveProperty('password');
    });

    it('powinno rzucić NotFoundException gdy użytkownik nie istnieje', async () => {
      // Arrange
      const validId = new Types.ObjectId().toString();
      const query = createMockQuery(null);
      mockUserModel.findById.mockReturnValue(query);

      // Act & Assert
      await expect(service.findOne(validId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(validId)).rejects.toThrow('User not found');
    });

    it('powinno rzucić NotFoundException dla nieprawidłowego ObjectId', async () => {
      // Arrange
      const invalidId = 'invalid-id-123';

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow(NotFoundException);
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('powinno poprawnie walidować format ObjectId', async () => {
      // Arrange
      const invalidIds = ['123', 'abc', '', 'not-an-objectid'];

      // Act & Assert
      for (const id of invalidIds) {
        await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      }
    });
  });

  describe('findByIdSafe', () => {
    it('powinno zwrócić użytkownika gdy istnieje', async () => {
      // Arrange
      const validId = mockUser._id.toString();
      const query = createMockQuery(mockUserWithoutPassword);
      mockUserModel.findById.mockReturnValue(query);
      const expectedUser = mockUserWithoutPassword;

      // Act
      const result = await service.findByIdSafe(validId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(result).not.toHaveProperty('password');
    });

    it('powinno zwrócić null dla nieprawidłowego ObjectId (nie rzuca błędu)', async () => {
      // Arrange
      const invalidId = 'invalid-id';

      // Act
      const result = await service.findByIdSafe(invalidId);

      // Assert
      expect(result).toBeNull();
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('powinno zwrócić null gdy użytkownik nie istnieje', async () => {
      // Arrange
      const validId = new Types.ObjectId().toString();
      const query = createMockQuery(null);
      mockUserModel.findById.mockReturnValue(query);

      // Act
      const result = await service.findByIdSafe(validId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('powinno zwrócić użytkownika wraz z hasłem', async () => {
      // Arrange
      const email = mockUser.email;
      const query = createMockQuery(mockUser);
      mockUserModel.findOne.mockReturnValue(query);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });
      expect(query.select).toHaveBeenCalledWith('+password');
      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('password');
    });

    it('powinno zwrócić null gdy użytkownik nie istnieje', async () => {
      // Arrange
      const email = 'nonexistent@test.com';
      const query = createMockQuery(null);
      mockUserModel.findOne.mockReturnValue(query);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });

    it('powinno być case-sensitive dla emaila (MongoDB domyślnie)', async () => {
      // Arrange
      const email = 'Test@Example.com';
      const query = createMockQuery(null);
      mockUserModel.findOne.mockReturnValue(query);

      // Act
      await service.findByEmail(email);

      // Assert
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });
      expect(mockUserModel.findOne).not.toHaveBeenCalledWith({ 
        email: email.toLowerCase() 
      });
    });
  });

  describe('create', () => {
    it('powinno utworzyć nowego użytkownika i zwrócić dane bez hasła', async () => {
      // Arrange
      const userData = {
        email: 'new@test.com',
        name: 'New User',
        password: 'hashedPassword123',
      };
      
      const createdUser = {
        ...userData,
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ ...userData, _id: new Types.ObjectId() }),
      };
      
      mockUserModel.create.mockResolvedValue(createdUser);
      const expectedCreatePayload = userData;
      const expectedSanitized = {
        email: userData.email,
        name: userData.name,
        _id: expect.any(Types.ObjectId),
      };

      // Act
      const result = await service.create(userData);

      // Assert
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining(expectedCreatePayload),
      );
      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject(expectedSanitized as Record<string, unknown>);
    });

    it('powinno utworzyć użytkownika bez pola name (opcjonalne)', async () => {
      // Arrange
      const userData = {
        email: 'test@test.com',
        password: 'hashedPassword',
      };
      
      const createdUser = {
        ...userData,
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ ...userData, _id: new Types.ObjectId() }),
      };
      
      mockUserModel.create.mockResolvedValue(createdUser);

      // Act
      const result = await service.create(userData as any);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('email');
    });

    it('powinno poprawnie usunąć pole password z odpowiedzi', async () => {
      // Arrange
      const userData = {
        email: 'test@test.com',
        password: 'hashedPassword',
        name: 'Test',
      };
      
      const createdUserWithPassword = {
        ...userData,
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockImplementation(() => ({
          ...userData,
          _id: new Types.ObjectId(),
          password: 'hashedPassword',
        })),
      };
      
      mockUserModel.create.mockResolvedValue(createdUserWithPassword);

      // Act
      const result = await service.create(userData);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(createdUserWithPassword.toObject().password).toBeDefined(); // Oryginał ma hasło
      expect(result['password']).toBeUndefined(); // Zwrócony obiekt nie ma hasła
    });
  });

  describe('setPasswordByEmail', () => {
    it('powinno zaktualizować hasło użytkownika', async () => {
      // Arrange
      const email = mockUser.email;
      const hashedPassword = '$2b$10$newHashedPassword';
      const updateResult = { matchedCount: 1, modifiedCount: 1 };
      
      const mockExec = jest.fn().mockResolvedValue(updateResult);
      mockUserModel.updateOne.mockReturnValue({ exec: mockExec });

      // Act
      await service.setPasswordByEmail(email, hashedPassword);

      // Assert
      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { email },
        { $set: { password: hashedPassword } },
      );
      expect(mockExec).toHaveBeenCalled();
    });

    it('powinno rzucić NotFoundException gdy użytkownik nie istnieje', async () => {
      // Arrange
      const email = 'nonexistent@test.com';
      const hashedPassword = 'hashedPassword';
      const updateResult = { matchedCount: 0, modifiedCount: 0 };
      
      const mockExec = jest.fn().mockResolvedValue(updateResult);
      mockUserModel.updateOne.mockReturnValue({ exec: mockExec });

      // Act & Assert
      await expect(
        service.setPasswordByEmail(email, hashedPassword),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.setPasswordByEmail(email, hashedPassword),
      ).rejects.toThrow('User not found');
    });

    it('powinno obsłużyć różne formaty updateResult (matchedCount i n)', async () => {
      // Arrange
      const email = mockUser.email;
      const hashedPassword = 'hashedPassword';
      
      // Testujemy format z 'n' zamiast 'matchedCount'
      const updateResultWithN = { n: 1, nModified: 1 };
      const mockExec = jest.fn().mockResolvedValue(updateResultWithN);
      mockUserModel.updateOne.mockReturnValue({ exec: mockExec });

      // Act
      await service.setPasswordByEmail(email, hashedPassword);

      // Assert - nie powinno rzucić błędu
      expect(mockExec).toHaveBeenCalled();
    });
  });

  describe('Edge cases i bezpieczeństwo', () => {
    it('powinno zawsze ukrywać hasło w metodach bez "+password"', async () => {
      // Arrange
      const validId = mockUser._id.toString();
      
      const listQuery = createMockQuery([mockUserWithoutPassword]);
      const singleQuery = createMockQuery(mockUserWithoutPassword);
      const safeQuery = createMockQuery(mockUserWithoutPassword);

      mockUserModel.find.mockReturnValue(listQuery);
      mockUserModel.findById
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(safeQuery);

      // Act & Assert
      const resultAll = await service.findAll();
      expect(resultAll[0]).not.toHaveProperty('password');

      const resultOne = await service.findOne(validId);
      expect(resultOne).not.toHaveProperty('password');

      const resultSafe = await service.findByIdSafe(validId);
      expect(resultSafe).not.toHaveProperty('password');
    });

    it('powinno zwracać hasło tylko w findByEmail', async () => {
      // Arrange
      const query = createMockQuery(mockUser);
      mockUserModel.findOne.mockReturnValue(query);

      // Act
      const result = await service.findByEmail(mockUser.email);

      // Assert
      expect(result).toHaveProperty('password');
      expect(query.select).toHaveBeenCalledWith('+password');
    });
  });
});
