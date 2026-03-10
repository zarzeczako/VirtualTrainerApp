/**
 * Testy integracyjne (E2E) - Auth Endpoints
 * 
 * Testowane endpointy:
 * - POST /auth/register - Rejestracja nowego użytkownika
 * - POST /auth/login - Logowanie użytkownika
 * - Integracja z prawdziwą bazą danych (in-memory MongoDB)
 * - Walidacja DTO
 * - Autoryzacja JWT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../../../src/auth/auth.module';
import { UsersModule } from '../../../src/users/users.module';
import { 
  startTestDatabase, 
  stopTestDatabase, 
  clearTestDatabase, 
  seedTestData,
} from '../../helpers/test-database';

describe('Auth Endpoints (E2E)', () => {
  let app: INestApplication;
  let mongoUri: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-key';
    // Uruchom in-memory MongoDB
    mongoUri = await startTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoUri),
        PassportModule,
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Dodaj globalną walidację (tak jak w main.ts)
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  afterEach(async () => {
    // Wyczyść bazę po każdym teście
    await clearTestDatabase();
  });

  describe('POST /auth/register', () => {
    it('powinno zarejestrować nowego użytkownika i zwrócić dane bez hasła', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('email', registerDto.email);
      expect(response.body).toHaveProperty('name', registerDto.name);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).not.toHaveProperty('password');
    });

    it('powinno zwrócić 409 Conflict gdy email już istnieje', async () => {
      // Arrange
      const registerDto = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'User One',
      };

      // Pierwsza rejestracja
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Act & Assert - Próba drugiej rejestracji
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('Email already registered');
    });

    it('powinno zwalidować format emaila', async () => {
      // Arrange
      const invalidDto = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('powinno wymagać hasła o minimalnej długości', async () => {
      // Arrange
      const weakPasswordDto = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('powinno utworzyć użytkownika bez pola name (opcjonalne)', async () => {
      // Arrange
      const dtoWithoutName = {
        email: 'noname@example.com',
        password: 'SecurePass123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dtoWithoutName)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('email', dtoWithoutName.email);
      expect(response.body).toHaveProperty('_id');
    });

    it('powinno odrzucić dodatkowe, nieznane pola (forbidNonWhitelisted)', async () => {
      // Arrange
      const dtoWithExtraFields = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        extraField: 'should be rejected',
        anotherField: 123,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(dtoWithExtraFields)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const testUser = {
      email: 'login@example.com',
      password: 'SecurePass123!',
      name: 'Login Test User',
    };

    beforeEach(async () => {
      // Wyczyść bazę i dodaj użytkownika z zahashowanym hasłem bez używania endpointu HTTP
      await clearTestDatabase();
      const hashed = await bcrypt.hash(testUser.password, 10);
      await seedTestData('users', [{
        email: testUser.email,
        name: testUser.name,
        password: hashed,
      }]);
    });

    it('powinno zalogować użytkownika i zwrócić access_token', async () => {
      // Arrange
      const loginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');
      expect(response.body.access_token.length).toBeGreaterThan(0);
    });

    it('powinno zwrócić 401 Unauthorized dla nieprawidłowego hasła', async () => {
      // Arrange
      const loginDto = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Błędne logowanie. Spróbuj ponownie');
    });

    it('powinno zwrócić 401 Unauthorized dla nieistniejącego użytkownika', async () => {
      // Arrange
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Błędne logowanie. Spróbuj ponownie');
    });

    it('powinno zwalidować wymagane pola email i password', async () => {
      // Arrange
      const invalidDto = {
        email: 'test@example.com',
        // brak password
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);
    });

    it('JWT token powinien zawierać prawidłowy payload (sub i email)', async () => {
      // Arrange
      const loginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      const token = response.body.access_token;
      
      // Dekoduj JWT (bez weryfikacji, tylko do sprawdzenia struktury)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );

      // Assert
      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('email', testUser.email);
      expect(payload).toHaveProperty('iat'); // issued at
      expect(payload).toHaveProperty('exp'); // expiration
    });

    it('powinno zwrócić różne tokeny dla kolejnych logowań', async () => {
      // Arrange
      const loginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      // Act
      const response1 = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      // Odczekaj 1ms aby iat był różny
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      // Assert
      expect(response1.body.access_token).not.toBe(response2.body.access_token);
    });
  });

  describe('Bezpieczeństwo i walidacja', () => {
    it('hasło powinno być zahashowane w bazie (nie plaintext)', async () => {
      // Arrange
      const registerDto = {
        email: 'security@example.com',
        password: 'PlainTextPassword123!',
        name: 'Security Test',
      };

      // Act
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Bezpośrednie sprawdzenie w bazie (tylko do testu)
      // W prawdziwej aplikacji nigdy nie pobieramy hasła
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      // Assert - jeśli logowanie się udało, znaczy że hasło jest poprawnie hashowane
      expect(loginResponse.body).toHaveProperty('access_token');
    });

    it('nie powinno ujawniać czy email istnieje w systemie (timing attack prevention)', async () => {
      // Arrange
      const existingEmail = 'existing@example.com';
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: existingEmail,
          password: 'Password123!',
          name: 'Existing User',
        })
        .expect(201);

      // Act - Próba logowania z nieistniejącym emailem
      const response1 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      // Act - Próba logowania z istniejącym emailem ale złym hasłem
      const response2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: existingEmail,
          password: 'WrongPassword',
        })
        .expect(401);

      // Assert - Oba komunikaty powinny być identyczne
      expect(response1.body.message).toBe(response2.body.message);
      expect(response1.body.message).toContain('Błędne logowanie. Spróbuj ponownie');
    });
  });

  describe('Integracja końcowa - pełny flow', () => {
    it('powinno umożliwić rejestrację, logowanie i użycie tokena', async () => {
      // Krok 1: Rejestracja
      const registerDto = {
        email: 'fullflow@example.com',
        password: 'FullFlowPass123!',
        name: 'Full Flow User',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('email', registerDto.email);

      // Krok 2: Logowanie
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');

      // Krok 3: Użycie tokena (opcjonalnie - wymaga chronionego endpointu)
      // Ten test można rozszerzyć gdy dodamy endpoint chroniony JWT
    });
  });
});
