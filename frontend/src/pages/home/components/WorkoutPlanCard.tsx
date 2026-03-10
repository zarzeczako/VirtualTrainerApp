import { useState } from 'react';
import type { WorkoutPlan } from '../models/workout-plan.model';
import {
  buildDefaultPlanDescription,
  getEquipmentLabel,
  getGoalLabel,
  getLevelLabel,
} from '../utils/workoutPlanLabels';

interface WorkoutPlanCardProps {
  plan: WorkoutPlan;
  onDelete?: (planId: string) => void;
  onView?: (planId: string) => void;
  onSetActive?: (planId: string) => void;
  className?: string;
  variant?: 'default' | 'hero';
  isExpanded?: boolean;
  onToggleDetails?: (planId: string) => void;
}

export default function WorkoutPlanCard({
  plan,
  onDelete,
  onView,
  onSetActive,
  className,
  variant = 'default',
  isExpanded,
  onToggleDetails,
}: WorkoutPlanCardProps) {
  const isControlled = typeof isExpanded === 'boolean' && Boolean(onToggleDetails);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const detailsOpen = isControlled ? Boolean(isExpanded) : internalExpanded;
  const toggleDetails = () => {
    if (isControlled && onToggleDetails) {
      onToggleDetails(plan._id);
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };
  const isActive = Boolean(plan.isActive);
  const equipmentKey = plan.equipmentPreset ?? plan.equipment ?? 'gym';
  const planDaysCount = plan.days?.length ?? 0;
  const daysPerWeek = plan.daysPerWeek ?? planDaysCount;
  const descriptionDaysCount = planDaysCount || daysPerWeek || 0;
  const totalExercises = plan.days?.reduce((sum, day) => sum + day.exercises.length, 0) ?? 0;
  const defaultDescription = buildDefaultPlanDescription(descriptionDaysCount, plan.goal, plan.level);
  const descriptionPattern = /^Plan \d+-dniowy/i;
  const descriptionText = !plan.description || descriptionPattern.test(plan.description)
    ? defaultDescription
    : plan.description;
  const badgeRowHeight = variant === 'hero' ? '' : 'min-h-[3.25rem]';
  const descriptionHeight = variant === 'hero' ? '' : 'min-h-[3.25rem]';

  const variantClasses = {
    card:
      variant === 'hero'
        ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 shadow-2xl'
        : 'bg-base-100 shadow-xl',
    body:
      variant === 'hero'
        ? 'card-body gap-6 md:flex md:flex-col'
        : 'card-body gap-5',
    title: variant === 'hero' ? 'text-3xl font-semibold text-base-content' : 'text-xl font-semibold text-base-content',
  };

  const heightClass = variant === 'hero' ? '' : 'min-h-[28rem]'
  const activeCardClass = isActive ? 'border border-success/20 bg-success/5' : ''

  return (
    <div className={`card flex flex-col ${heightClass} ${variantClasses.card} ${activeCardClass} ${className ?? ''}`}>
      <div className={`${variantClasses.body} flex-1`}> 
        <div className="flex justify-between gap-4 items-start">
          <div>
            <h3 className={`${variantClasses.title} mb-3`}>{plan.name}</h3>
            <div className={`flex flex-col gap-2 ${badgeRowHeight}`}>
              {isActive && (
                <span className="badge badge-success badge-lg">Aktywny plan</span>
              )}
              <span className="badge badge-primary badge-lg">
                {getLevelLabel(plan.level)}
              </span>
              <span className="badge badge-accent badge-lg">
                {getGoalLabel(plan.goal)}
              </span>
              <span className="badge badge-secondary badge-lg">
                {getEquipmentLabel(equipmentKey)}
              </span>
            </div>
          </div>
          {onDelete && !isActive && (
            <button
              onClick={() => onDelete(plan._id)}
              className="btn btn-ghost btn-sm btn-circle text-error"
              title="Usuń plan"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-base-content/80">
          <PlanStat icon="📅" label="dni w planie" value={`${planDaysCount}`} />
          <PlanStat icon="💪" label="ćwiczeń" value={`${totalExercises}`} />
        </div>

        <p className={`text-base-content/70 text-sm ${descriptionHeight}`}>
          {descriptionText}
        </p>

        <button
          onClick={toggleDetails}
          className="btn btn-ghost btn-sm justify-start w-fit"
        >
          {detailsOpen ? '▼ Ukryj szczegóły' : '▶ Pokaż szczegóły'}
        </button>

        {detailsOpen && (
          <div className="mt-2 space-y-3">
            {plan.days.map((day, index) => (
              <div key={day._id} className="border border-base-200 rounded-lg p-3 bg-base-200/60">
                <h4 className="font-semibold text-base-content mb-2">
                  Dzień {index + 1}: {day.name}
                </h4>
                <ul className="space-y-1 text-sm text-base-content/70">
                  {day.exercises.map((exercise) => (
                    <li key={exercise._id}>
                      • {exercise.name_pl} — {exercise.sets} serie × {exercise.reps}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-col gap-2">
            {onSetActive && (
              <button
                onClick={() => {
                  if (!isActive) onSetActive(plan._id)
                }}
                className={`btn btn-sm btn-block ${isActive ? 'btn-disabled cursor-default' : 'btn-outline'}`}
                disabled={isActive}
              >
                {isActive ? 'Aktywny plan' : 'Ustaw jako aktywny'}
              </button>
            )}
            {onView && (
              <button
                onClick={() => onView(plan._id)}
                className="btn btn-primary btn-block"
              >
                Zobacz plan
              </button>
            )}
          </div>
          <div className="mt-4 text-xs text-base-content/50">
            Utworzono:{' '}
            {new Date(plan.createdAt).toLocaleDateString('pl-PL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PlanStatProps {
  icon: string;
  label: string;
  value: string;
}

function PlanStat({ icon, label, value }: PlanStatProps) {
  return (
    <div className="flex items-center gap-3 bg-base-200/80 rounded-lg px-3 py-2">
      <span className="text-lg" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-base-content font-semibold leading-tight">{value}</p>
        <p className="text-xs uppercase tracking-wide text-base-content/60">{label}</p>
      </div>
    </div>
  );
}
