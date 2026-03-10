/**
 * Test Utilities - Wspólne funkcje pomocnicze dla testów
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

/**
 * Tworzy mock ObjectId z opcjonalnym stringiem
 */
export const createMockObjectId = (id?: string): Types.ObjectId => {
  return id ? new Types.ObjectId(id) : new Types.ObjectId();
};

/**
 * Tworzy mock dla Mongoose Model
 */
export const createMockMongooseModel = () => {
  return jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue(dto),
    toObject: jest.fn().mockReturnValue(dto),
    _id: createMockObjectId(),
  }));
};

/**
 * Tworzy mock query z metodami łańcuchowymi
 */
export const createMockQuery = (data: any) => {
  const query = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(data),
  };
  return query;
};

/**
 * Oczekiwanie z timeout dla testów asynchronicznych
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Ekstraktuje wszystkie wywołania funkcji mocka
 */
export const extractMockCalls = (mockFn: jest.Mock): any[][] => {
  return mockFn.mock.calls;
};

/**
 * Sprawdza czy obiekt zawiera wszystkie wymagane klucze
 */
export const hasRequiredKeys = (obj: any, keys: string[]): boolean => {
  return keys.every((key) => key in obj);
};

/**
 * Generuje losowy email testowy
 */
export const generateTestEmail = (): string => {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
};

/**
 * Generuje losowe hasło testowe
 */
export const generateTestPassword = (): string => {
  return `Test_Pass_${Math.random().toString(36).substring(7)}123!`;
};

/**
 * Czyści wszystkie mocki przed testem
 */
export const clearAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};
