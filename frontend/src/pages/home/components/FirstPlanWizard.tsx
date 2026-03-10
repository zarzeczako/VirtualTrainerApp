import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { GeneratePlanDto } from '../models/workout-plan.model';
import { TrainingLevel, TrainingGoal, EquipmentPreset } from '../models/workout-plan.model';
import { EXPERIENCE_LEVELS } from '../../../constants/experience-levels';

interface FirstPlanWizardProps {
  isOpen: boolean;
  onGenerate: (dto: GeneratePlanDto) => void;
  isGenerating: boolean;
}

interface WizardFormData {
  name: string;
  goal: string;
  experienceLevel: string;
  workoutsPerWeekTarget: string;
  trainingGoal: typeof TrainingGoal[keyof typeof TrainingGoal];
  equipment: typeof EquipmentPreset[keyof typeof EquipmentPreset];
}

const workoutsPerWeekOptions = ['2', '3', '4', '5'];

const mapExperienceLevelToTrainingLevel = (experienceLevel: string): typeof TrainingLevel[keyof typeof TrainingLevel] => {
  switch (experienceLevel) {
    case 'beginner':
      return TrainingLevel.BEGINNER;
    case 'intermediate':
      return TrainingLevel.INTERMEDIATE;
    case 'advanced':
      return TrainingLevel.ADVANCED;
    default:
      return TrainingLevel.BEGINNER;
  }
};

export default function FirstPlanWizard({ isOpen, onGenerate, isGenerating }: FirstPlanWizardProps) {
  const [step, setStep] = useState(1);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WizardFormData>({
    defaultValues: {
      name: 'Mój pierwszy plan',
      goal: '',
      experienceLevel: '',
      workoutsPerWeekTarget: '3',
      trainingGoal: TrainingGoal.GENERAL,
      equipment: EquipmentPreset.BODYWEIGHT,
    },
  });

  const watchedFields = watch();
  const isCalisthenicsGoal = watchedFields.trainingGoal === TrainingGoal.CALISTHENICS;

  useEffect(() => {
    if (isCalisthenicsGoal) {
      setValue('equipment', EquipmentPreset.BODYWEIGHT, { shouldValidate: true });
    }
  }, [isCalisthenicsGoal, setValue]);

  const onSubmit = (data: WizardFormData) => {
    // Upewnij się, że formularz submituje tylko w kroku 3
    if (step !== 3) {
      return;
    }
    
    const dto: GeneratePlanDto = {
      name: data.name,
      level: mapExperienceLevelToTrainingLevel(data.experienceLevel),
      goal: data.trainingGoal,
      daysPerWeek: parseInt(data.workoutsPerWeekTarget, 10),
      equipment: data.equipment,
    };
    onGenerate(dto);
  };

  const handleGenerate = () => {
    handleSubmit(onSubmit)();
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-base-200/90 backdrop-blur-sm" aria-hidden="true"></div>
      <div className="relative z-10 flex min-h-full items-center justify-center p-4 sm:p-8">
        <div className="card relative w-full max-w-3xl bg-base-100 text-base-content shadow-2xl">
          <div className="card-body gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm uppercase tracking-widest text-base-content/60">
                Witaj w Wirtualnym Trenerze!
              </p>
              <h2 className="text-3xl font-bold text-base-content">
                Stwórzmy Twój pierwszy plan treningowy
              </h2>
              <p className="text-base-content/70">
                Odpowiedz na kilka pytań, aby dopasować plan do Twoich potrzeb
              </p>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i <= step ? 'bg-primary' : 'bg-base-300'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-6">
              {/* Krok 1: Cele treningowe */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-base-200 bg-base-200/40 p-6">
                    <h3 className="text-xl font-bold text-base-content mb-4">
                      Twoje cele treningowe
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="goal">
                          Jaki jest Twój główny cel?
                        </label>
                        <input
                          id="goal"
                          type="text"
                          className="input input-bordered w-full"
                          placeholder="np. Redukcja tkanki tłuszczowej, budowa masy mięśniowej"
                          {...register('goal', {
                            required: 'Opisz swój cel',
                            minLength: { value: 5, message: 'Cel powinien mieć co najmniej 5 znaków' },
                            maxLength: { value: 120, message: 'Cel może mieć maksymalnie 120 znaków' },
                          })}
                        />
                        {errors.goal && (
                          <p className="text-xs text-error mt-1">{errors.goal.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="experienceLevel">
                          Poziom zaawansowania
                        </label>
                        <select
                          id="experienceLevel"
                          className="select select-bordered w-full"
                          {...register('experienceLevel', {
                            required: 'Wybierz poziom zaawansowania',
                          })}
                        >
                          <option value="">Wybierz poziom</option>
                          {EXPERIENCE_LEVELS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {errors.experienceLevel && (
                          <p className="text-xs text-error mt-1">{errors.experienceLevel.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="workoutsPerWeekTarget">
                          Ile razy w tygodniu chcesz trenować?
                        </label>
                        <select
                          id="workoutsPerWeekTarget"
                          className="select select-bordered w-full"
                          {...register('workoutsPerWeekTarget', {
                            required: 'Określ liczbę treningów',
                          })}
                        >
                          {workoutsPerWeekOptions.map((count) => (
                            <option key={count} value={count}>
                              {count} {count === '1' ? 'raz' : 'razy'} w tygodniu
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-base-content/60 mt-1">
                          Pomaga dopasować objętość planu treningowego
                        </p>
                        {errors.workoutsPerWeekTarget && (
                          <p className="text-xs text-error mt-1">{errors.workoutsPerWeekTarget.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Krok 2: Szczegóły planu */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-base-200 bg-base-200/40 p-6">
                    <h3 className="text-xl font-bold text-base-content mb-4">
                      Dostosuj plan do swoich możliwości
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="name">
                          Nazwa planu
                        </label>
                        <input
                          id="name"
                          type="text"
                          className="input input-bordered w-full"
                          placeholder="np. Mój plan treningowy"
                          {...register('name', {
                            required: 'Nazwa planu jest wymagana',
                          })}
                        />
                        {errors.name && (
                          <p className="text-xs text-error mt-1">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="trainingGoal">
                          Typ treningu
                        </label>
                        <select
                          id="trainingGoal"
                          className="select select-bordered w-full"
                          {...register('trainingGoal')}
                        >
                          <option value={TrainingGoal.GENERAL}>Ogólna sprawność</option>
                          <option value={TrainingGoal.STRENGTH}>Trening siłowy</option>
                          <option value={TrainingGoal.HYPERTROPHY}>Masa mięśniowa</option>
                          <option value={TrainingGoal.CALISTHENICS}>Kalistenika</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="equipment">
                          Dostępny sprzęt
                        </label>
                        <select
                          id="equipment"
                          className="select select-bordered w-full"
                          {...register('equipment')}
                          disabled={isGenerating || isCalisthenicsGoal}
                        >
                          <option value={EquipmentPreset.BODYWEIGHT}>Tylko ciężar ciała</option>
                          <option value={EquipmentPreset.FREE_WEIGHT} disabled={isCalisthenicsGoal}>
                            Wolne ciężary (sztangi/hantle)
                          </option>
                          <option value={EquipmentPreset.GYM} disabled={isCalisthenicsGoal}>
                            Pełna siłownia
                          </option>
                        </select>
                        <p className="text-xs text-base-content/60 mt-1">
                          {isCalisthenicsGoal
                            ? 'Przy kalistenice korzystamy wyłącznie z ciężaru ciała.'
                            : 'Wybierz sprzęt, do którego masz dostęp'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Krok 3: Podsumowanie */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-base-200 bg-base-200/40 p-6">
                    <h3 className="text-xl font-bold text-base-content mb-4">
                      Sprawdź i wygeneruj plan
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-base-300">
                        <span className="text-base-content/70">Nazwa planu:</span>
                        <span className="font-semibold">{watchedFields.name}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-base-300">
                        <span className="text-base-content/70">Twój cel:</span>
                        <span className="font-semibold">{watchedFields.goal || '-'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-base-300">
                        <span className="text-base-content/70">Poziom:</span>
                        <span className="font-semibold">
                          {EXPERIENCE_LEVELS.find((l) => l.value === watchedFields.experienceLevel)?.label || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-base-300">
                        <span className="text-base-content/70">Treningi w tygodniu:</span>
                        <span className="font-semibold">{watchedFields.workoutsPerWeekTarget}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-base-300">
                        <span className="text-base-content/70">Typ treningu:</span>
                        <span className="font-semibold">
                          {watchedFields.trainingGoal === TrainingGoal.GENERAL && 'Ogólna sprawność'}
                          {watchedFields.trainingGoal === TrainingGoal.STRENGTH && 'Trening siłowy'}
                          {watchedFields.trainingGoal === TrainingGoal.HYPERTROPHY && 'Masa mięśniowa'}
                          {watchedFields.trainingGoal === TrainingGoal.CALISTHENICS && 'Kalistenika'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-base-content/70">Sprzęt:</span>
                        <span className="font-semibold">
                          {watchedFields.equipment === EquipmentPreset.BODYWEIGHT && 'Ciężar ciała'}
                          {watchedFields.equipment === EquipmentPreset.FREE_WEIGHT && 'Wolne ciężary'}
                          {watchedFields.equipment === EquipmentPreset.GYM && 'Pełna siłownia'}
                        </span>
                      </div>
                    </div>

                    <div className="alert alert-info mt-6">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span>Twój plan zostanie automatycznie wygenerowany na podstawie podanych informacji</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Nawigacja */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn btn-outline flex-1"
                    disabled={isGenerating}
                  >
                    ← Wstecz
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn btn-primary flex-1"
                    disabled={
                      (step === 1 && (!watchedFields.goal || !watchedFields.experienceLevel || !watchedFields.workoutsPerWeekTarget)) ||
                      (step === 2 && !watchedFields.name)
                    }
                  >
                    Dalej →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="btn btn-primary flex-1"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Generowanie...
                      </>
                    ) : (
                      'Wygeneruj plan treningowy'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
