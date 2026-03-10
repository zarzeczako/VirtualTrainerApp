/**
 * Test Database - Konfiguracja in-memory MongoDB dla testów integracyjnych
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, disconnect } from 'mongoose';

let mongoServer: MongoMemoryServer;
let mongoConnection: Connection;

/**
 * Uruchamia in-memory MongoDB server
 */
export const startTestDatabase = async (): Promise<string> => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  const connection = await connect(mongoUri);
  mongoConnection = connection.connection;
  
  return mongoUri;
};

/**
 * Zamyka połączenie z bazą i zatrzymuje server
 */
export const stopTestDatabase = async (): Promise<void> => {
  if (mongoConnection) {
    await disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Czyści wszystkie kolekcje w bazie
 */
export const clearTestDatabase = async (): Promise<void> => {
  if (mongoConnection) {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

/**
 * Dodaje testowe dane do kolekcji
 */
export const seedTestData = async (collectionName: string, data: any[]): Promise<void> => {
  if (mongoConnection) {
    const collection = mongoConnection.collection(collectionName);
    await collection.insertMany(data);
  }
};
