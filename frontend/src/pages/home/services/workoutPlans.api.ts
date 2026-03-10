import http from '../../../services/http';
import type {
  GeneratePlanDto,
  SwapExerciseDto,
  WorkoutPlan,
} from '../models/workout-plan.model';

class WorkoutPlansService {
  private readonly baseUrl = '/workout-plans';

  async getAllPlans(): Promise<WorkoutPlan[]> {
    const response = await http.get<WorkoutPlan[]>(this.baseUrl);
    return response.data;
  }

  async getPlan(planId: string): Promise<WorkoutPlan> {
    const response = await http.get<WorkoutPlan>(`${this.baseUrl}/${planId}`);
    return response.data;
  }

  async generatePlan(dto: GeneratePlanDto): Promise<WorkoutPlan> {
    const response = await http.post<WorkoutPlan>(`${this.baseUrl}/generate`, dto);
    return response.data;
  }

  async deletePlan(planId: string): Promise<{ message: string }> {
    const response = await http.delete<{ message: string }>(`${this.baseUrl}/${planId}`);
    return response.data;
  }

  async setActivePlan(planId: string): Promise<WorkoutPlan> {
    const response = await http.patch<WorkoutPlan>(`${this.baseUrl}/${planId}/activate`, {});
    return response.data;
  }

  async swapExercise(dto: SwapExerciseDto): Promise<WorkoutPlan> {
    const response = await http.post<WorkoutPlan>(`${this.baseUrl}/swap-exercise`, dto);
    return response.data;
  }
}

export const workoutPlansService = new WorkoutPlansService();
