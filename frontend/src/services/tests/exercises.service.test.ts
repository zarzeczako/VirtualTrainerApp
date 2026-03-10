import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import AxiosMockAdapter from 'axios-mock-adapter'
import http from '../http'
import { exercisesService } from '../exercises.service'

let mock: AxiosMockAdapter

beforeEach(() => {
  mock = new AxiosMockAdapter(http)
})

afterEach(() => {
  mock.restore()
})

describe('exercisesService', () => {
  it('pobiera listę ćwiczeń z podstawowej kolekcji', async () => {
    const payload = [
      { _id: '1', apiId: 'pushup', name: 'Push Up', name_pl: 'Pompka', bodyPart: 'chest', target: 'pectorals', equipment: 'body weight' },
    ]
    mock.onGet('/exercises').reply(200, payload)

    const exercises = await exercisesService.getAllExercises()

    expect(exercises).toEqual(payload)
  })

  it('pobiera ćwiczenia Swap dla danej partii ciała', async () => {
    const payload = [
      { _id: '2', apiId: 'swap-squat', name: 'Squat', name_pl: 'Przysiad', bodyPart: 'legs', target: 'quads', equipment: 'barbell' },
    ]
    mock.onGet('/exercises/swap/bodypart/legs').reply(200, payload)

    const exercises = await exercisesService.getSwapExercisesByBodyPart('legs')

    expect(exercises).toEqual(payload)
  })

  it('odrzuca błąd gdy backend zwraca 404 dla ćwiczenia', async () => {
    mock.onGet('/exercises/unknown').reply(404, { message: 'Not found' })

    await expect(exercisesService.getExerciseById('unknown')).rejects.toMatchObject({
      response: { status: 404 },
    })
  })
})
