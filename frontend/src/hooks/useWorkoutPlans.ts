import { useState, useEffect, useCallback } from 'react';
import { workoutPlansService } from '../pages/home/services/workoutPlans.api';
import type { WorkoutPlan, GeneratePlanDto } from '../pages/home/models/workout-plan.model';
import { extractApiErrorMessage } from '../pages/home/utils/apiError';

interface UseWorkoutPlansReturn {
  plans: WorkoutPlan[];
  loading: boolean;
  error: string | null;
  isGenerating: boolean;
  fetchPlans: () => Promise<void>;
  generatePlan: (dto: GeneratePlanDto) => Promise<WorkoutPlan>;
  deletePlan: (planId: string) => Promise<void>;
  activatePlan: (planId: string) => Promise<void>;
}

export const useWorkoutPlans = (userId: string | null): UseWorkoutPlansReturn => {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!userId) {
      setPlans([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const workoutPlans = await workoutPlansService.getAllPlans();
      setPlans(workoutPlans);
    } catch (err) {
      const message = extractApiErrorMessage(err, 'Nie udało się załadować planów');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const generatePlan = useCallback(async (dto: GeneratePlanDto): Promise<WorkoutPlan> => {
    try {
      setIsGenerating(true);
      setError(null);
      const newPlan = await workoutPlansService.generatePlan(dto);
      
      setPlans((prev) => [
        { ...newPlan, isActive: true },
        ...prev.map((plan) => ({ ...plan, isActive: false })),
      ]);
      
      return newPlan;
    } catch (err) {
      const message = extractApiErrorMessage(err, 'Nie udało się wygenerować planu');
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    try {
      setError(null);
      await workoutPlansService.deletePlan(planId);
      await fetchPlans();
    } catch (err) {
      const message = extractApiErrorMessage(err, 'Nie udało się usunąć planu');
      setError(message);
      throw err;
    }
  }, [fetchPlans]);

  const activatePlan = useCallback(async (planId: string): Promise<void> => {
    try {
      setError(null);
      await workoutPlansService.setActivePlan(planId);
      
      setPlans((prev) =>
        prev.map((plan) => ({
          ...plan,
          isActive: plan._id === planId,
        }))
      );
    } catch (err) {
      const message = extractApiErrorMessage(err, 'Nie udało się aktywować planu');
      setError(message);
      throw err;
    }
  }, []);

  return {
    plans,
    loading,
    error,
    isGenerating,
    fetchPlans,
    generatePlan,
    deletePlan,
    activatePlan,
  };
};
