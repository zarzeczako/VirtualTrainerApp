import type { AtlasExercise } from '../models/exercise-atlas.model'
import { ALL_BODY_PARTS_OPTION } from '../models/exercise-atlas.model'

export type ExerciseFilterPredicate = (exercise: AtlasExercise) => boolean

export const filterExercises = (
  exercises: AtlasExercise[],
  selectedFilter: string,
  searchTerm: string,
  customPredicates: Record<string, ExerciseFilterPredicate> = {},
): AtlasExercise[] => {
  const normalizedQuery = searchTerm.trim().toLowerCase()

  return exercises.filter((exercise) => {
    const matchesFilter = (() => {
      if (selectedFilter === ALL_BODY_PARTS_OPTION) {
        return true
      }

      const predicate = customPredicates[selectedFilter]
      if (predicate) {
        return predicate(exercise)
      }

      return exercise.bodyPart === selectedFilter
    })()

    if (!matchesFilter) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    const namePl = exercise.name_pl?.toLowerCase() ?? ''
    const nameEn = exercise.name?.toLowerCase() ?? ''
    const target = exercise.target?.toLowerCase() ?? ''

    const matchesSearch =
      namePl.includes(normalizedQuery) || nameEn.includes(normalizedQuery) || target.includes(normalizedQuery)

    return matchesSearch
  })
}
