/**
 * Testy integracyjne (E2E) - Exercises Endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { ExercisesModule } from '../../../src/exercises/exercises.module';
import { 
  startTestDatabase, 
  stopTestDatabase, 
  clearTestDatabase,
  seedTestData 
} from '../../helpers/test-database';
import { mockExercise, mockSwapExercise } from '../../helpers/mock-data';

describe('Exercises Endpoints (E2E)', () => {
  let app: INestApplication;
  let mongoUri: string;
  let testExerciseId: string;

  beforeAll(async () => {
    mongoUri = await startTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        ExercisesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    // Seed testowe dane
    await seedTestData('exercises', [mockExercise]);
    await seedTestData('swapexercises', [mockSwapExercise]);
    testExerciseId = mockExercise._id.toString();
  });

  describe('GET /exercises', () => {
    it('powinno zwrócić listę wszystkich ćwiczeń', async () => {
      const response = await request(app.getHttpServer())
        .get('/exercises')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name_pl');
      expect(response.body[0]).toHaveProperty('bodyPart');
    });
  });

  describe('GET /exercises/:id', () => {
    it('powinno zwrócić pełne dane ćwiczenia', async () => {
      const response = await request(app.getHttpServer())
        .get(`/exercises/${testExerciseId}`)
        .expect(200);

      expect(response.body).toHaveProperty('name_pl');
      expect(response.body).toHaveProperty('instructions');
    });

    it('powinno zwrócić 404 dla nieistniejącego ID', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      await request(app.getHttpServer())
        .get(`/exercises/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /exercises/bodyPart/:bodyPart', () => {
    it('powinno zwrócić ćwiczenia dla danej partii ciała', async () => {
      const response = await request(app.getHttpServer())
        .get('/exercises/bodyPart/chest')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((ex: any) => {
        expect(ex.bodyPart).toBe('chest');
      });
    });
  });

  describe('GET /exercises/swap', () => {
    it('powinno zwrócić ćwiczenia ze Swap Library', async () => {
      const response = await request(app.getHttpServer())
        .get('/exercises/swap')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });
});
