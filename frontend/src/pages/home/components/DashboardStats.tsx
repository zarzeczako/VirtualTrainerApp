import type { WorkoutPlan } from '../models/workout-plan.model';

interface DashboardStatsProps {
  plans: WorkoutPlan[];
}

export default function DashboardStats({ plans }: DashboardStatsProps) {
  const totalPlans = plans.length;
  const totalExercises = plans.reduce(
    (sum, plan) =>
      sum + (plan.days ?? []).reduce((daySum, day) => daySum + (day.exercises?.length ?? 0), 0),
    0
  );
  const getDaysInPlan = (plan: WorkoutPlan) => plan.days?.length ?? 0;

  const avgDaysInPlan = totalPlans > 0
    ? Math.round(plans.reduce((sum, plan) => sum + getDaysInPlan(plan), 0) / totalPlans)
    : 0;

  const stats = [
    {
      name: 'Plany Treningowe',
      value: totalPlans,
      icon: '📋',
      color: 'bg-primary',
    },
    {
      name: 'Łącznie Ćwiczeń',
      value: totalExercises,
      icon: '💪',
      color: 'bg-success',
    },
    {
      name: 'Średnia liczba dni w planie',
      value: Number.isFinite(avgDaysInPlan) ? avgDaysInPlan : 0,
      icon: '📅',
      color: 'bg-secondary',
    },
    {
      name: 'Ostatni Plan',
      value: totalPlans > 0 ? new Date(plans[0].createdAt).toLocaleDateString('pl-PL') : '-',
      icon: '🗓️',
      color: 'bg-accent',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
        >
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs text-base-content/70 mb-1">{stat.name}</div>
                <div className="text-2xl font-bold text-base-content">{stat.value}</div>
              </div>
              <div className="text-3xl opacity-70">
                {stat.icon}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
