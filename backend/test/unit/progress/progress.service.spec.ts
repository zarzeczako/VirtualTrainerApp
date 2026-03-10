import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProgressService } from '../../../src/progress/progress.service';

const userId = '507f1f77bcf86cd799439011';

describe('ProgressService', () => {
  const workoutPlanModel = { findOne: jest.fn() } as any;
  const userProgressModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  } as any;
  const userModel = { findById: jest.fn() } as any;

  let service: ProgressService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProgressService(workoutPlanModel, userProgressModel, userModel);
  });

  it('computes BMI using fallback height when user has no height set', async () => {
    const progressDoc = {
      weightEntries: [{ date: '2025-01-01', weight: 80 }],
      strengthEntries: [],
    } as any;

    userProgressModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(progressDoc),
    });

    userModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ heightCm: undefined }),
    });

    jest
      .spyOn<any, any>(service as any, 'computeMuscleDistributionFromActivePlan')
      .mockResolvedValue({ hasActivePlan: false, data: [] });

    const stats = await service.getProgressStats(userId);

    const expectedBmi = 80 / (1.78 * 1.78);
    expect(stats.currentBMI).toBeCloseTo(expectedBmi, 1);
    expect(stats.bmiHistory).toHaveLength(1);
    expect(stats.bmiHistory[0].value).toBeCloseTo(expectedBmi, 1);
  });

  it('blocks anomalous strength jumps above 20% unless force flag is set', async () => {
    const progressDoc = {
      strengthEntries: [
        {
          exercise: 'Martwy ciąg',
          entries: [{ date: '2025-01-01', weight: 100, reps: 1 }],
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    userProgressModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(progressDoc) });
    userProgressModel.create.mockImplementation(() => progressDoc);

    await expect(
      service.addStrengthEntry({ exercise: 'Martwy ciąg', weight: 140, date: '2025-02-01' }, userId),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.addStrengthEntry(
        { exercise: 'Martwy ciąg', weight: 140, date: '2025-02-01', force: true },
        userId,
      ),
    ).resolves.not.toThrow();

    const entries = progressDoc.strengthEntries[0].entries;
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ weight: 140, date: '2025-02-01', reps: 1 });
    expect(progressDoc.save).toHaveBeenCalled();
  });
});
