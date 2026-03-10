import axios from './http';

export interface AdminUser {
  _id: string;
  email: string;
  name?: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPlans: number;
  totalExercises: number;
  totalChatMessages: number;
  blockedUsers: number;
  activeUsers: number;
  plansCreatedThisWeek: number;
  chatQueriesThisWeek: number;
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  isBlocked?: boolean;
}

export interface Exercise {
  _id: string;
  apiId: string;
  name: string;
  name_pl: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  instructions: string[];
  instructions_pl: string[];
  role: string;
  pattern: string;
  difficulty: number;
  is_unilateral: boolean;
}

export interface ExercisesResponse {
  data: Exercise[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class AdminService {
  async getStats(): Promise<AdminStats> {
    const response = await axios.get('/admin/stats');
    return response.data;
  }

  async getRecentActivity(limit: number = 10) {
    const response = await axios.get('/admin/activity', {
      params: { limit },
    });
    return response.data;
  }

  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    isBlocked?: boolean,
  ): Promise<UsersResponse> {
    const response = await axios.get('/admin/users', {
      params: { page, limit, search, role, isBlocked },
    });
    return response.data;
  }

  async getUserById(id: string): Promise<AdminUser> {
    const response = await axios.get(`/admin/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
    const response = await axios.put(`/admin/users/${id}`, payload);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await axios.delete(`/admin/users/${id}`);
  }

  async toggleBlockUser(id: string): Promise<{ isBlocked: boolean; message: string }> {
    const response = await axios.put(`/admin/users/${id}/toggle-block`);
    return response.data;
  }

  // Exercise Management
  async getExercises(
    page: number = 1,
    limit: number = 20,
    search?: string,
    isGoldenList?: boolean,
  ): Promise<ExercisesResponse> {
    const response = await axios.get('/admin/exercises', {
      params: { page, limit, search, isGoldenList },
    });
    return response.data;
  }

  async getSwapExercises(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<ExercisesResponse> {
    const response = await axios.get('/admin/swap-exercises', {
      params: { page, limit, search },
    });
    return response.data;
  }

  async getExerciseById(id: string): Promise<Exercise> {
    const response = await axios.get(`/admin/exercises/${id}`);
    return response.data;
  }

  async createExercise(exerciseData: Partial<Exercise>): Promise<Exercise> {
    const response = await axios.post('/admin/exercises', exerciseData);
    return response.data;
  }

  async updateExercise(id: string, exerciseData: Partial<Exercise>): Promise<Exercise> {
    const response = await axios.put(`/admin/exercises/${id}`, exerciseData);
    return response.data;
  }

  async deleteExercise(id: string): Promise<void> {
    await axios.delete(`/admin/exercises/${id}`);
  }
}

export const adminService = new AdminService();
