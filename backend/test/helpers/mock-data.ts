/**
 * Mock Data - Testowe dane dla różnych serwisów
 */

import { Types } from 'mongoose';
import { ExerciseRole, ExercisePattern } from '../../src/exercises/schemas/exercise.schema';

/**
 * Mock użytkownika
 */
export const mockUser = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
  email: 'test@example.com',
  name: 'Test User',
  password: '$2b$10$XQ3Z9Z9Z9Z9Z9Z9Z9Z9Z9uHashedPassword', // przykładowy hash bcrypt
};

export const mockUserWithoutPassword = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
  email: 'test@example.com',
  name: 'Test User',
};

/**
 * Mock ćwiczenia
 */
export const mockExercise = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
  apiId: '0001',
  name: 'Push-up',
  name_pl: 'Pompki',
  bodyPart: 'chest',
  target: 'pectorals',
  equipment: 'body weight',
  gifUrl: 'https://example.com/pushup.gif',
  secondaryMuscles: ['triceps', 'shoulders'],
  instructions: ['Step 1', 'Step 2'],
  difficulty: 3,
  role: ExerciseRole.MAIN_T2,
  pattern: ExercisePattern.PUSH_H,
};

export const mockSwapExercise = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
  apiId: '0002',
  name: 'Decline Push-up',
  name_pl: 'Pompki na skosie',
  bodyPart: 'chest',
  target: 'pectorals',
  equipment: 'body weight',
  gifUrl: 'https://example.com/decline-pushup.gif',
  secondaryMuscles: ['triceps', 'shoulders'],
  instructions_pl: ['Krok 1', 'Krok 2'],
};

/**
 * Mock planu treningowego
 */
export const mockWorkoutPlan = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
  name: 'Test Plan FBW',
  user: new Types.ObjectId('507f1f77bcf86cd799439011'),
  level: 'intermediate',
  goal: 'hypertrophy',
  equipmentPreset: 'gym',
  description: 'Plan 3-dniowy (hypertrophy) dla intermediate.',
  days: [
    {
      _id: new Types.ObjectId('507f1f77bcf86cd799439015'),
      name: 'Trening FBW A',
      exercises: [
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439016'),
          exercise: new Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Push-up',
          name_pl: 'Pompki',
          sets: 3,
          reps: '10-12',
        },
      ],
    },
  ],
};

/**
 * Mock parametrów generowania planu
 */
export const mockGeneratePlanDto = {
  name: 'Mój Plan Treningowy',
  daysPerWeek: 3,
  level: 'intermediate' as any,
  goal: 'hypertrophy' as any,
  equipment: 'gym' as any,
};

/**
 * Mock DTO rejestracji
 */
export const mockRegisterDto = {
  email: 'newuser@example.com',
  password: 'SecurePass123!',
  name: 'New User',
};

/**
 * Mock DTO logowania
 */
export const mockLoginDto = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

/**
 * Mock JWT payload
 */
export const mockJwtPayload = {
  sub: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
};

/**
 * Mock JWT token
 */
export const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.mock_signature';

/**
 * Lista mockowanych ćwiczeń dla różnych partii ciała
 */
export const mockExercisesList = [
  {
    _id: new Types.ObjectId(),
    apiId: '0001',
    name: 'Squat',
    name_pl: 'Przysiad',
    bodyPart: 'legs',
    target: 'quadriceps',
    equipment: 'barbell',
    role: ExerciseRole.MAIN_T1,
    pattern: ExercisePattern.QUAD,
    instructions: ['Set the bar on your upper back', 'Descend until hips break parallel', 'Drive up through your heels'],
    instructions_pl: ['Ustaw sztangę na górnej części pleców', 'Schodz do momentu gdy biodra są poniżej kolan', 'Wypchnij się piętami w górę'],
    difficulty: 6,
    is_unilateral: false,
  },
  {
    _id: new Types.ObjectId(),
    apiId: '0002',
    name: 'Deadlift',
    name_pl: 'Martwy ciąg',
    bodyPart: 'back',
    target: 'spine',
    equipment: 'barbell',
    role: ExerciseRole.MAIN_T1,
    pattern: ExercisePattern.HINGE,
    instructions: ['Stand with mid-foot under bar', 'Brace core and pull while driving hips forward'],
    instructions_pl: ['Stań z gryfem nad środkiem stopy', 'Napnij korpus i podnosząc wypychaj biodra w przód'],
    difficulty: 7,
    is_unilateral: false,
  },
  {
    _id: new Types.ObjectId(),
    apiId: '0003',
    name: 'Bench Press',
    name_pl: 'Wyciskanie sztangi',
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'barbell',
    role: ExerciseRole.MAIN_T1,
    pattern: ExercisePattern.PUSH_H,
    instructions: ['Lie on bench and set scapulae', 'Lower bar to mid chest', 'Press back to lockout'],
    instructions_pl: ['Połóż się na ławce i ustaw łopatki', 'Opuść sztangę do środka klatki', 'Wypchnij do wyprostu ramion'],
    difficulty: 5,
    is_unilateral: false,
  },
  {
    _id: new Types.ObjectId(),
    apiId: '0004',
    name: 'Pull-up',
    name_pl: 'Podciąganie',
    bodyPart: 'back',
    target: 'lats',
    equipment: 'pull-up bar',
    role: ExerciseRole.MAIN_T2,
    pattern: ExercisePattern.PULL_V,
    instructions: ['Grip the bar slightly wider than shoulders', 'Pull chest to bar', 'Lower under control'],
    instructions_pl: ['Złap drążek nieco szerzej niż barki', 'Przyciągnij klatkę do drążka', 'Kontrolowanie opuszczaj'],
    difficulty: 6,
    is_unilateral: false,
  },
];

/**
 * Mock Dialogflow webhook body
 */
export const mockDialogflowBody = {
  queryResult: {
    intent: {
      displayName: 'PytanieOTechnike',
    },
    parameters: {
      exercise_name: 'pompki',
      muscle_group: null,
      equipment: null,
    },
    queryText: 'jak wykonać pompki',
  },
};
