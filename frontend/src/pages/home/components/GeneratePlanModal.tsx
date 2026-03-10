import { useMemo, useState } from 'react'
import type { GeneratePlanDto } from '../models/workout-plan.model'
import { TrainingLevel, TrainingGoal, EquipmentPreset } from '../models/workout-plan.model'

interface GeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (dto: GeneratePlanDto) => void;
  isGenerating: boolean;
}

export default function GeneratePlanModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}: GeneratePlanModalProps) {
  const [formData, setFormData] = useState<GeneratePlanDto>({
    name: '',
    level: TrainingLevel.BEGINNER,
    goal: TrainingGoal.GENERAL,
    daysPerWeek: 3,
    equipment: EquipmentPreset.BODYWEIGHT,
  })

  const isCalisthenicsGoal = formData.goal === TrainingGoal.CALISTHENICS

  const dayMarks = useMemo(() => Array.from({ length: 4 }, (_, index) => index + 2), [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-base-200/80 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => !isGenerating && onClose()}
      ></div>
      <div className="relative z-10 flex min-h-full items-center justify-center p-4 sm:p-8">
        <div
          role="dialog"
          aria-modal="true"
          className="card relative w-full max-w-2xl bg-base-100 text-base-content shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle absolute right-4 top-4"
            disabled={isGenerating}
            aria-label="Zamknij"
          >
            ✕
          </button>
          <div className="card-body gap-6">
            <div className="flex flex-col gap-2 pr-12">
              <p className="text-sm uppercase tracking-widest text-base-content/60">
                Kreator planu
              </p>
              <h2 className="text-2xl font-bold text-base-content">
                Wygeneruj nowy plan treningowy
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nazwa planu */}
            <div>
              <label className="block text-sm font-semibold text-base-content mb-2">
                Nazwa planu
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input input-bordered w-full"
                placeholder="np. Mój plan treningowy"
                required
                disabled={isGenerating}
              />
            </div>

            {/* Poziom zaawansowania */}
            <div>
              <label className="block text-sm font-semibold text-base-content mb-2">
                Poziom zaawansowania
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as typeof TrainingLevel[keyof typeof TrainingLevel] })}
                className="select select-bordered w-full"
                disabled={isGenerating}
              >
                <option value={TrainingLevel.BEGINNER}>Początkujący</option>
                <option value={TrainingLevel.INTERMEDIATE}>Średniozaawansowany</option>
                <option value={TrainingLevel.ADVANCED}>Zaawansowany</option>
              </select>
            </div>

            {/* Cel treningowy */}
            <div>
              <label className="block text-sm font-semibold text-base-content mb-2">
                Cel treningowy
              </label>
              <select
                value={formData.goal}
                onChange={(e) => {
                  const nextGoal = e.target.value as typeof TrainingGoal[keyof typeof TrainingGoal]
                  setFormData((prev) => ({
                    ...prev,
                    goal: nextGoal,
                    equipment:
                      nextGoal === TrainingGoal.CALISTHENICS
                        ? EquipmentPreset.BODYWEIGHT
                        : prev.equipment,
                  }))
                }}
                className="select select-bordered w-full"
                disabled={isGenerating}
              >
                <option value={TrainingGoal.CALISTHENICS}>Kalistenika</option>
                <option value={TrainingGoal.STRENGTH}>Siła</option>
                <option value={TrainingGoal.HYPERTROPHY}>Masa Mięśniowa</option>
                <option value={TrainingGoal.GENERAL}>Ogólna Sprawność</option>
              </select>
            </div>

            {/* Dni w tygodniu */}
            <div>
              <label className="text-sm font-semibold text-base-content">
                Dni treningowe w tygodniu
              </label>
              <input
                type="range"
                min="2"
                max="5"
                step="1"
                value={formData.daysPerWeek}
                onChange={(e) => setFormData({ ...formData, daysPerWeek: parseInt(e.target.value, 10) })}
                className="range range-primary w-full"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-xs text-base-content/60">
                {dayMarks.map((mark) => (
                  <span key={mark}>{mark}</span>
                ))}
              </div>
            </div>

            {/* Sprzęt */}
            <div>
              <label className="block text-sm font-semibold text-base-content mb-2">
                Dostępny sprzęt
              </label>
              <select
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value as typeof EquipmentPreset[keyof typeof EquipmentPreset] })}
                className="select select-bordered w-full"
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
              {isCalisthenicsGoal && (
                <p className="text-xs text-base-content/60 mt-1">
                  Przy kalistenice używamy wyłącznie ciężaru ciała.
                </p>
              )}
            </div>

            {/* Przyciski */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline flex-1"
                disabled={isGenerating}
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  'Wygeneruj plan'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  )
}
