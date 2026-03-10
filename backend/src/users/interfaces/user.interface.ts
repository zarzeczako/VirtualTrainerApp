export interface CreateUserData {
  email: string;
  name?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  provider?: string;
  providerId?: string;
}

export interface UserQuery {
  email?: string;
  _id?: string;
  provider?: string;
  providerId?: string;
  isBlocked?: boolean;
}

export interface PasswordResetData {
  resetPasswordToken: string;
  resetPasswordExpires: Date;
}
