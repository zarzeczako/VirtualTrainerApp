import axios from './http';

export interface Exercise {
  _id: string;
  apiId: string;
  name: string;
  name_pl: string;
  bodyPart: string;
  target: string;
  equipment: string;
  instructions?: string[];
  instructions_pl?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const exercisesService = {
  async getAllExercises(): Promise<Exercise[]> {
    const response = await axios.get('/exercises');
    return response.data;
  },

  /**
   * 🆕 Pobiera wszystkie ćwiczenia ze Swap Library (1324 ćwiczeń)
   * Użyj tej metody dla Atlasu Ćwiczeń
   */
  async getAllSwapExercises(): Promise<Exercise[]> {
    const response = await axios.get('/exercises/swap');
    return response.data;
  },

  async getExerciseById(id: string): Promise<Exercise> {
    const response = await axios.get(`/exercises/${id}`);
    return response.data;
  },

  /**
   * 🆕 Pobiera jedno ćwiczenie ze Swap Library
   */
  async getSwapExerciseById(id: string): Promise<Exercise> {
    const response = await axios.get(`/exercises/swap/${id}`);
    return response.data;
  },

  async getBodyParts(): Promise<string[]> {
    const response = await axios.get('/exercises/bodyparts');
    return response.data;
  },

  async getExercisesByBodyPart(bodyPart: string): Promise<Exercise[]> {
    const response = await axios.get(`/exercises/bodypart/${bodyPart}`);
    return response.data;
  },

  /**
   * 🆕 Pobiera ćwiczenia ze Swap Library dla konkretnej partii ciała
   */
  async getSwapExercisesByBodyPart(bodyPart: string): Promise<Exercise[]> {
    const response = await axios.get(`/exercises/swap/bodypart/${bodyPart}`);
    return response.data;
  },
};
