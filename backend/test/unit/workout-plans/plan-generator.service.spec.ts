import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PlanGeneratorService } from '../../../src/workout-plans/plan-generator.service';
import { PlanRefinementService } from '../../../src/workout-plans/plan-refinement/plan-refinement.service';
import { EquipmentPreset, GeneratePlanDto, TrainingGoal, TrainingLevel } from '../../../src/workout-plans/dto/generate-plan.dto';
import { WorkoutPlan } from '../../../src/workout-plans/schemas/workout-plan.schema';
import { ExercisesService } from '../../../src/exercises/exercises.service';
import { RecommendationService } from '../../../src/recommendations/recommendations.service';
import { ExercisePattern, ExerciseRole } from '../../../src/exercises/schemas/exercise.schema';

const createExercise = (overrides: Partial<any> = {}) => ({
  _id: new Types.ObjectId(),
  apiId: overrides.apiId ?? new Types.ObjectId().toHexString(),
  name: overrides.name ?? 'Exercise',
  name_pl: overrides.name_pl ?? 'Ćwiczenie',
  pattern: overrides.pattern ?? ExercisePattern.PUSH_H,
  role: overrides.role ?? ExerciseRole.MAIN_T1,
  equipment: overrides.equipment ?? 'body weight',
  difficulty: overrides.difficulty ?? 5,
});

describe('PlanGeneratorService', () => {
  let service: PlanGeneratorService;
  let exercisesService: { findExercisesByFilter: jest.Mock };
  let recommendationService: { getMostDiverseExercise: jest.Mock };
  let planRefinementService: { refinePlan: jest.Mock };
  let workoutPlanModel: any;
  let lastSavedPlan: any;

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'user@example.com',
  } as any;

  const fullExercisePool = [
    // Main compounds for each pattern
    createExercise({ pattern: ExercisePattern.QUAD, role: ExerciseRole.MAIN_T1, name: 'Squat', apiId: 'quad-1', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.QUAD, role: ExerciseRole.MAIN_T2, name: 'Split Squat', apiId: 'quad-2', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.HINGE, role: ExerciseRole.MAIN_T1, name: 'Hinge', apiId: 'hinge-1', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.HINGE, role: ExerciseRole.ACCESSORY, name: 'Hip Hinge', apiId: 'hinge-2', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.PUSH_H, role: ExerciseRole.MAIN_T1, name: 'Bench', apiId: 'pushh-1', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.PUSH_H, role: ExerciseRole.MAIN_T2, name: 'Incline', apiId: 'pushh-2', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.PUSH_V, role: ExerciseRole.MAIN_T1, name: 'Press', apiId: 'pushv-1', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.PULL_H, role: ExerciseRole.MAIN_T1, name: 'Row', apiId: 'pullh-1', equipment: 'body weight', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.PULL_V, role: ExerciseRole.MAIN_T1, name: 'Pull', apiId: 'pullv-1', equipment: 'pull-up bar', difficulty: 4 }),
    createExercise({ pattern: ExercisePattern.PULL_V, role: ExerciseRole.MAIN_T2, name: 'Pull Alt', apiId: 'pullv-2', equipment: 'pull-up bar', difficulty: 4 }),
    // Accessories and isolation
    createExercise({ pattern: ExercisePattern.ARM_FLEXION, role: ExerciseRole.ACCESSORY, name: 'Curl', apiId: 'curl-1', equipment: 'body weight' }),
    createExercise({ pattern: ExercisePattern.ARM_EXTENSION, role: ExerciseRole.ACCESSORY, name: 'Extension', apiId: 'ext-1', equipment: 'body weight' }),
    createExercise({ pattern: ExercisePattern.CORE, role: ExerciseRole.CORE, name: 'Plank', apiId: 'core-1', equipment: 'body weight' }),
    createExercise({ pattern: ExercisePattern.OTHER, role: ExerciseRole.ISOLATION, name: 'Calf', apiId: 'calf-1', equipment: 'body weight' }),
  ];

  beforeEach(async () => {
    lastSavedPlan = undefined;

    const findByIdChain = () => ({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => lastSavedPlan),
    });

    workoutPlanModel = jest.fn().mockImplementation((data) => {
      lastSavedPlan = { ...data, _id: new Types.ObjectId() };
      return {
        ...data,
        save: jest.fn().mockResolvedValue(lastSavedPlan),
      };
    });
    workoutPlanModel.updateMany = jest.fn().mockResolvedValue({});
    workoutPlanModel.findById = jest.fn().mockImplementation(() => findByIdChain());

    exercisesService = {
      findExercisesByFilter: jest.fn(),
    } as any;

    recommendationService = {
      getMostDiverseExercise: jest.fn((available: any[]) => available[0]),
    } as any;

    planRefinementService = {
      refinePlan: jest.fn(async (days) => days),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanGeneratorService,
        { provide: getModelToken(WorkoutPlan.name), useValue: workoutPlanModel },
        { provide: ExercisesService, useValue: exercisesService },
        { provide: RecommendationService, useValue: recommendationService },
        { provide: PlanRefinementService, useValue: planRefinementService },
      ],
    }).compile();

    service = module.get<PlanGeneratorService>(PlanGeneratorService);
  });

  it('generates FBW plan using body-weight preset and calisthenics filters', async () => {
    exercisesService.findExercisesByFilter.mockResolvedValue(fullExercisePool);

    const dto: GeneratePlanDto = {
      name: 'Plan BW',
      level: TrainingLevel.BEGINNER,
      goal: TrainingGoal.CALISTHENICS,
      daysPerWeek: 3,
      equipment: EquipmentPreset.BODYWEIGHT,
    } as any;

    const result = await service.generatePlan(dto, mockUser);

    expect(exercisesService.findExercisesByFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        equipment: { $in: ['body weight', 'pull-up bar', 'stability ball'] },
        isGoldenList: true,
      }),
      1350,
    );
    expect(workoutPlanModel.updateMany).toHaveBeenCalledWith(
      { user: mockUser._id, isActive: true },
      { $set: { isActive: false } },
    );
    expect(result.days).toHaveLength(3);
    expect(result.description).toContain('3-dniowy');
  });

  it('throws when not enough push/pull/legs exercises exist', async () => {
    exercisesService.findExercisesByFilter.mockResolvedValue([
      createExercise({ pattern: ExercisePattern.QUAD, role: ExerciseRole.MAIN_T1, apiId: 'quad-1' }),
    ]);

    const dto: GeneratePlanDto = {
      name: 'Broken',
      level: TrainingLevel.BEGINNER,
      goal: TrainingGoal.STRENGTH,
      daysPerWeek: 3,
      equipment: EquipmentPreset.GYM,
    } as any;

    await expect(service.generatePlan(dto, mockUser)).rejects.toThrow(BadRequestException);
  });
});
