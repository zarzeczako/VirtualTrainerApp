import http from './http.ts';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginResponse { access_token: string }

export interface UserProfile {
  id?: string;
  userId?: string;
  _id?: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  goal?: string;
  experienceLevel?: string;
  weightKg?: number;
  heightCm?: number;
  workoutsPerWeekTarget?: number;
  avatarUrl?: string;
  avatarBackground?: string;
  themePreference?: string;
  bio?: string;
  birthDate?: string;
  role?: string;
}

export type UpdateProfilePayload = Partial<{
  firstName: string;
  lastName: string;
  name: string;
  city: string;
  goal: string;
  experienceLevel: string;
  weightKg: number;
  heightCm: number;
  workoutsPerWeekTarget: number;
  bio: string;
  birthDate: string;
  themePreference: string;
  avatarUrl: string;
  avatarDataUrl: string;
}>;

export interface UpdateEmailPayload {
  currentPassword: string;
  newEmail: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  async login(data: LoginDto): Promise<LoginResponse> {
    const response = await http.post(`/auth/login`, data);
    return response.data;
  }

  async register(data: RegisterDto): Promise<{ email: string; name?: string; _id?: unknown }> {
    const response = await http.post(`/auth/register`, data);
    return response.data;
  }

  async getProfile(): Promise<UserProfile> {
    const response = await http.get(`/auth/profile`);
    const profile = response.data as UserProfile;
    return {
      ...profile,
      id: profile.id ?? profile._id ?? profile.userId,
    };
  }

  async updateProfile(data: UpdateProfilePayload): Promise<UserProfile> {
    const response = await http.patch(`/users/me/profile`, data);
    const profile = response.data as UserProfile;
    return {
      ...profile,
      id: profile.id ?? profile._id ?? profile.userId,
    };
  }

  async updateEmail(data: UpdateEmailPayload): Promise<UserProfile> {
    const response = await http.patch(`/users/me/email`, data);
    const profile = response.data as UserProfile;
    return {
      ...profile,
      id: profile.id ?? profile._id ?? profile.userId,
    };
  }

  async updatePassword(data: UpdatePasswordPayload): Promise<{ ok: true }> {
    const response = await http.patch(`/users/me/password`, data);
    return response.data;
  }

  async completeOnboarding(data: UpdateProfilePayload): Promise<UserProfile> {
    const response = await http.patch(`/users/me/complete-onboarding`, data);
    const profile = response.data as UserProfile;
    return {
      ...profile,
      id: profile.id ?? profile._id ?? profile.userId,
    };
  }

  setToken(token: string): void {
    sessionStorage.setItem('token', token);
  }

  logout(): void {
    sessionStorage.removeItem('token');
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
