import type { Exercise } from '../../../services/exercises.service'

export type AtlasExercise = Exercise

export interface AtlasFiltersState {
  selectedBodyPart: string
  searchTerm: string
}

export const ALL_BODY_PARTS_OPTION = 'all'
