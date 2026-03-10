import type {
  UpdateProfilePayload,
  UserProfile,
} from '../../../services/auth.service';

export type AuthenticatedUser = UserProfile;

export type ProfileEditableFields = UpdateProfilePayload;

export const PROFILE_PLACEHOLDER: AuthenticatedUser = {
  email: '',
  firstName: '',
  lastName: '',
  city: '',
  goal: '',
  experienceLevel: '',
  weightKg: undefined,
  heightCm: undefined,
  workoutsPerWeekTarget: undefined,
  avatarUrl: undefined,
  avatarBackground: undefined,
  themePreference: undefined,
  bio: '',
  name: '',
  birthDate: undefined,
};

export const getDisplayName = (user: AuthenticatedUser | null): string => {
  if (!user) return 'Użytkownik';
  if (user.name) return user.name;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (user.email) return user.email.split('@')[0] ?? user.email;
  return 'Użytkownik';
};
