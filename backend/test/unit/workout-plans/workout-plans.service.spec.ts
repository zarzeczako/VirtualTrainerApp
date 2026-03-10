import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WorkoutPlansService } from '../../../src/workout-plans/workout-plans.service';
import { WorkoutPlan } from '../../../src/workout-plans/schemas/workout-plan.schema';
import { RecommendationService } from '../../../src/recommendations/recommendations.service';
import { ExercisesService } from '../../../src/exercises/exercises.service';
import { ExerciseRole } from '../../../src/exercises/schemas/exercise.schema';

const createQueryChain = (result: any) => ({
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createPlanExercise = (overrides: Partial<any> = {}) => {
  const exerciseDoc = {
    _id: new Types.ObjectId(),
    apiId: 'old-1',
    name: 'Old Exercise',
    name_pl: 'Stare ćwiczenie',
    equipment: 'body weight',
    role: ExerciseRole.MAIN_T1,
    ...overrides,
  };

  return {
    _id: new Types.ObjectId(),
    exercise: exerciseDoc,
    name: exerciseDoc.name,
    name_pl: exerciseDoc.name_pl,
    sets: 3,
    reps: '8-10',
  };
};

const createPlan = (overrides: Partial<any> = {}) => {
  const plan = {
    _id: new Types.ObjectId(),
    user: new Types.ObjectId(),
    isActive: true,
    equipmentPreset: 'body-weight',
    days: [
      {
        _id: new Types.ObjectId(),
        name: 'Day A',
        exercises: [createPlanExercise()],
      },
    ],
    markModified: jest.fn(),
    save: jest.fn(),
    toObject: jest.fn(),
    ...overrides,
  };

  if (!plan.save.mock) {
    plan.save = jest.fn();
  }

  if (!plan.save.getMockImplementation()) {
    plan.save.mockResolvedValue({ ...plan });
  }

  return plan;
};

describe('WorkoutPlansService', () => {
  let service: WorkoutPlansService;
  let recommendationService: { getSimilarExercises: jest.Mock };
  let exercisesService: { findExercisesByFilter: jest.Mock };
  let workoutPlanModel: any;
  let findByIdMock: jest.Mock;

  const userId = new Types.ObjectId().toHexString();
  const otherUserId = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    findByIdMock = jest.fn();

    workoutPlanModel = {
      find: jest.fn(),
      findById: findByIdMock,
      findOne: jest.fn(),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      updateMany: jest.fn(),
    };

    recommendationService = {
      getSimilarExercises: jest.fn(),
    } as any;

    exercisesService = {
      findExercisesByFilter: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutPlansService,
        { provide: getModelToken(WorkoutPlan.name), useValue: workoutPlanModel },
        { provide: RecommendationService, useValue: recommendationService },
        { provide: ExercisesService, useValue: exercisesService },
      ],
    }).compile();

    service = module.get<WorkoutPlansService>(WorkoutPlansService);
  });

  it('throws ForbiddenException when plan belongs to a different user', async () => {
    const foreignPlan = createPlan({ user: new Types.ObjectId(otherUserId) });
    findByIdMock.mockReturnValue(createQueryChain(foreignPlan));

    await expect(service.findOne(foreignPlan._id.toHexString(), userId)).rejects.toThrow(ForbiddenException);
  });

  it('sets active plan and deactivates others', async () => {
    const plan = createPlan({ user: new Types.ObjectId(userId), isActive: false });
    plan.save = jest.fn().mockResolvedValue({ ...plan, isActive: true });
    plan.toObject.mockReturnValue({ ...plan, isActive: true });

    workoutPlanModel.findOne.mockReturnValue(createQueryChain(plan));
    workoutPlanModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

    const result = await service.setActivePlan(plan._id.toHexString(), userId);

    expect(workoutPlanModel.updateMany).toHaveBeenCalledWith(
      {
        user: new Types.ObjectId(userId),
        _id: { $ne: plan._id },
        isActive: true,
      },
      { $set: { isActive: false } },
    );
    expect(plan.save).toHaveBeenCalled();
    expect(result.isActive).toBe(true);
  });

  it('swaps exercise respecting equipment preset and uniqueness', async () => {
    const plan = createPlan({
      user: new Types.ObjectId(userId),
      equipmentPreset: 'body-weight',
    });
    const exerciseApiId = plan.days[0].exercises[0].exercise.apiId;

    const newExerciseDoc = {
      _id: new Types.ObjectId(),
      apiId: 'new-1',
      name: 'New Exercise',
      name_pl: 'Nowe ćwiczenie',
      equipment: 'body weight',
    };

    const updatedPlan = {
      ...plan,
      days: [
        {
          ...plan.days[0],
          exercises: [
            {
              ...plan.days[0].exercises[0],
              exercise: newExerciseDoc,
              name: newExerciseDoc.name,
              name_pl: newExerciseDoc.name_pl,
            },
          ],
        },
      ],
    };

    findByIdMock
      .mockReturnValueOnce(createQueryChain(plan))
      .mockReturnValueOnce(createQueryChain(updatedPlan));

    recommendationService.getSimilarExercises.mockResolvedValue([
      { apiId: 'old-1', equipment: 'kettlebell', name: 'Dup' },
      { apiId: 'new-1', equipment: 'body weight', name: 'Push up' },
    ]);

    exercisesService.findExercisesByFilter.mockResolvedValue([newExerciseDoc]);

    const result = await service.swapExercise(
      {
        planId: plan._id.toHexString(),
        dayId: plan.days[0]._id.toHexString(),
        exerciseToSwapId: plan.days[0].exercises[0]._id.toHexString(),
      },
      userId,
    );

    expect(recommendationService.getSimilarExercises).toHaveBeenCalledWith(exerciseApiId, 100);
    expect(exercisesService.findExercisesByFilter).toHaveBeenCalledWith({ apiId: { $in: ['new-1'] } }, 1);
    expect(result.days[0].exercises[0].name_pl).toBe(newExerciseDoc.name_pl);
  });

  it('throws BadRequestException when no alternatives are available', async () => {
    const plan = createPlan({ user: new Types.ObjectId(userId) });

    findByIdMock.mockReturnValue(createQueryChain(plan));
    recommendationService.getSimilarExercises.mockResolvedValue([]);

    await expect(
      service.swapExercise(
        {
          planId: plan._id.toHexString(),
          dayId: plan.days[0]._id.toHexString(),
          exerciseToSwapId: plan.days[0].exercises[0]._id.toHexString(),
        },
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when plan is missing', async () => {
    findByIdMock.mockReturnValue(createQueryChain(null));
    await expect(service.findOne(new Types.ObjectId().toHexString(), userId)).rejects.toThrow(NotFoundException);
  });
});
