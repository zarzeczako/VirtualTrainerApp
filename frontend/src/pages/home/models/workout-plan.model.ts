export const TrainingLevel = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const

export type TrainingLevel = (typeof TrainingLevel)[keyof typeof TrainingLevel]

export const TrainingGoal = {
  CALISTHENICS: 'calisthenics',
  STRENGTH: 'strength',
  HYPERTROPHY: 'hypertrophy',
  GENERAL: 'general',
} as const

export type TrainingGoal = (typeof TrainingGoal)[keyof typeof TrainingGoal]

export const EquipmentPreset = {
  BODYWEIGHT: 'body-weight',
  FREE_WEIGHT: 'free-weight',
  GYM: 'gym',
} as const

export type EquipmentPreset = (typeof EquipmentPreset)[keyof typeof EquipmentPreset]

export interface GeneratePlanDto {
  name: string
  level: TrainingLevel
  goal: TrainingGoal
  daysPerWeek: number
  equipment: EquipmentPreset
}

export interface SwapExerciseDto {
  planId: string
  dayId: string
  exerciseToSwapId: string
}

export interface Exercise {
  _id: string
  apiId: string
  name: string
  name_pl: string
  category: string
  category_pl: string
  equipment: string
  equipment_pl: string
  level: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  instructions_pl: string[]
}

export interface PlanExercise {
  _id: string
  exercise: Exercise
  name: string
  name_pl: string
  sets: number
  reps: string
  rest: string
}

export interface WorkoutDay {
  _id: string
  name: string
  exercises: PlanExercise[]
}

export interface WorkoutPlan {
  _id: string
  user: string
  name: string
  level: TrainingLevel
  goal: TrainingGoal
  daysPerWeek: number
  equipment: EquipmentPreset
  equipmentPreset?: EquipmentPreset
  description?: string
  days: WorkoutDay[]
  createdAt: string
  updatedAt: string
  isActive?: boolean
}
