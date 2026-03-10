/**
 * Testy jednostkowe - AuthService
 * 
 * Testowane funkcjonalności:
 * - Rejestracja nowego użytkownika
 * - Logowanie użytkownika
 * - Ustawianie hasła dla istniejącego użytkownika
 * - Walidacja danych wejściowych
 * - Obsługa błędów (duplikat email, nieprawidłowe dane)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../../src/auth/email.service';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/auth/auth.service';
import { UsersService } from '../../../src/users/users.service';
import { mockUser, mockRegisterDto, mockLoginDto } from '../../helpers/mock-data';

// Mock modułu bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    setPasswordByEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset wszystkich mocków przed każdym testem
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('powinno zarejestrować nowego użytkownika z zahashowanym hasłem', async () => {
      // Arrange
      const hashedPassword = '$2b$10$hashedPassword';
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        email: mockRegisterDto.email,
        name: mockRegisterDto.name,
        _id: mockUser._id,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockRegisterDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: mockRegisterDto.email,
        name: mockRegisterDto.name,
        password: hashedPassword,
      });
      expect(result).toEqual({
        email: mockRegisterDto.email,
        name: mockRegisterDto.name,
        _id: mockUser._id,
      });
      expect(result).not.toHaveProperty('password'); // Hasło nie powinno być zwracane
    });

    it('powinno rzucić ConflictException gdy email już istnieje', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('powinno poprawnie hashować hasło z saltem 10', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ email: mockRegisterDto.email });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      // Act
      await authService.register(mockRegisterDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 10);
    });
  });

  describe('login', () => {
    it('powinno zwrócić access_token dla prawidłowych danych logowania', async () => {
      // Arrange
      const token = 'jwt.token.here';
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue(token);

      // Act
      const result = await authService.login(mockLoginDto);

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginDto.password, mockUser.password);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: mockUser._id.toString(),
          email: mockUser.email,
        },
        expect.objectContaining({ jwtid: expect.any(String) }),
      );
      expect(result).toEqual({ access_token: token });
    });

    it('powinno rzucić UnauthorizedException gdy użytkownik nie istnieje', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        'Błędne logowanie. Spróbuj ponownie',
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('powinno rzucić BadRequestException gdy użytkownik nie ma ustawionego hasła', async () => {
      // Arrange
      const userWithoutPassword = { ...mockUser, password: undefined };
      mockUsersService.findByEmail.mockResolvedValue(userWithoutPassword);

      // Act & Assert
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        'Użytkownik nie ma ustawionego hasła',
      );
    });

    it('powinno rzucić UnauthorizedException gdy hasło jest nieprawidłowe', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        'Błędne logowanie. Spróbuj ponownie',
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('powinno poprawnie konwertować _id na string w JWT payload', async () => {
      // Arrange
      const token = 'jwt.token.here';
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue(token);

      // Act
      await authService.login(mockLoginDto);

      // Assert
      const signAsyncCall = mockJwtService.signAsync.mock.calls[0][0];
      expect(typeof signAsyncCall.sub).toBe('string');
      expect(signAsyncCall.sub).toBe(mockUser._id.toString());
    });
  });

  describe('setPasswordForExistingUser', () => {
    it('powinno ustawić hasło dla użytkownika bez hasła', async () => {
      // Arrange
      const userWithoutPassword = { ...mockUser, password: undefined };
      const newPassword = 'NewSecurePass123!';
      const hashedPassword = '$2b$10$newHashedPassword';
      
      mockUsersService.findByEmail.mockResolvedValue(userWithoutPassword);
      mockUsersService.setPasswordByEmail.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await authService.setPasswordForExistingUser(mockUser.email, newPassword);

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUsersService.setPasswordByEmail).toHaveBeenCalledWith(
        mockUser.email,
        hashedPassword,
      );
      expect(result).toEqual({ ok: true });
    });

    it('powinno rzucić BadRequestException gdy użytkownik nie istnieje', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.setPasswordForExistingUser('nonexistent@test.com', 'password'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        authService.setPasswordForExistingUser('nonexistent@test.com', 'password'),
      ).rejects.toThrow('User not found');
      expect(mockUsersService.setPasswordByEmail).not.toHaveBeenCalled();
    });

    it('powinno rzucić BadRequestException gdy użytkownik już ma hasło', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.setPasswordForExistingUser(mockUser.email, 'newPassword'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        authService.setPasswordForExistingUser(mockUser.email, 'newPassword'),
      ).rejects.toThrow('User already has a password');
      expect(mockUsersService.setPasswordByEmail).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases i bezpieczeństwo', () => {
    it('nie powinno ujawniać informacji czy email istnieje podczas logowania', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      try {
        await authService.login(mockLoginDto);
      } catch (error) {
        expect(error.message).toBe('Błędne logowanie. Spróbuj ponownie');
        expect(error.message).not.toContain('user');
        expect(error.message).not.toContain('email');
      }
    });

    it('powinno używać stałego salt value (10) dla bcrypt', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ email: 'test@test.com' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      // Act
      await authService.register({ email: 'test@test.com', password: 'pass', name: 'Test' });

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(bcrypt.hash).not.toHaveBeenCalledWith('pass', expect.any(String));
    });
  });
});
