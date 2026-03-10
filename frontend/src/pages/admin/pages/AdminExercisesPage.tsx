import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import type { Exercise, ExercisesResponse } from '../../../services/admin.service';

export default function AdminExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showOnlyGolden, setShowOnlyGolden] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({
    apiId: '',
    name: '',
    name_pl: '',
    bodyPart: '',
    target: '',
    equipment: '',
    gifUrl: '',
    instructions: [],
    instructions_pl: [],
    role: 'accessory',
    pattern: 'other',
    difficulty: 5,
    is_unilateral: false,
  });

  const limit = 20;

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: ExercisesResponse = showOnlyGolden
        ? await adminService.getExercises(page, limit, search, true)
        : await adminService.getSwapExercises(page, limit, search);
      setExercises(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Błąd ładowania ćwiczeń';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [limit, page, search, showOnlyGolden]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  const handleCreate = async () => {
    try {
      await adminService.createExercise(newExercise);
      setShowCreateModal(false);
      setNewExercise({
        apiId: '',
        name: '',
        name_pl: '',
        bodyPart: '',
        target: '',
        equipment: '',
        gifUrl: '',
        instructions: [],
        instructions_pl: [],
        role: 'accessory',
        pattern: 'other',
        difficulty: 5,
        is_unilateral: false,
      });
      loadExercises();
      alert('Ćwiczenie zostało utworzone');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Błąd tworzenia ćwiczenia';
      alert(message);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise({ ...exercise });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingExercise) return;

    try {
      await adminService.updateExercise(editingExercise._id, editingExercise);
      setShowEditModal(false);
      setEditingExercise(null);
      loadExercises();
      alert('Ćwiczenie zostało zaktualizowane');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Błąd aktualizacji ćwiczenia';
      alert(message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć ćwiczenie "${name}"?`)) return;

    try {
      await adminService.deleteExercise(id);
      loadExercises();
      alert('Ćwiczenie zostało usunięte');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Błąd usuwania ćwiczenia';
      alert(message);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Zarządzanie ćwiczeniami</h1>
          <p className="text-base-content/70">
            Zarządzaj bazą ćwiczeń {showOnlyGolden ? '(Złota Lista)' : '(Wszystkie – biblioteka swap)'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            className={`btn ${showOnlyGolden ? 'btn-accent' : 'btn-ghost'}`}
            onClick={() => {
              setShowOnlyGolden(!showOnlyGolden);
              setPage(1);
            }}
          >
            {showOnlyGolden ? '⭐ Złota Lista' : '📚 Wszystkie'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-5 w-5" />
            Dodaj ćwiczenie
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button className="btn btn-sm" onClick={loadExercises}>
            Spróbuj ponownie
          </button>
        </div>
      )}

      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="mb-4 flex items-center gap-4">
            <div className="form-control flex-1">
              <label className="label mb-3">
                <span className="label-text pr-4">Szukaj</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Nazwa, część ciała..."
                  className="input input-bordered w-full pl-4"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="text-sm text-base-content/60">Znaleziono {total} ćwiczeń</div>

          <div className="divider my-2"></div>

          {exercises.length === 0 ? (
            <p className="text-center text-base-content/60">Brak ćwiczeń</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nazwa PL</th>
                    <th>Nazwa EN</th>
                    <th>Część ciała</th>
                    <th>Sprzęt</th>
                    <th>Trudność</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.map((exercise) => (
                    <tr key={exercise._id}>
                      <td className="font-semibold">{exercise.name_pl}</td>
                      <td className="text-sm text-base-content/70">{exercise.name}</td>
                      <td>
                        <span className="badge badge-outline">{exercise.bodyPart}</span>
                      </td>
                      <td className="text-sm">{exercise.equipment}</td>
                      <td>
                        <span className="text-sm">{exercise.difficulty}/10</span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleEdit(exercise)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => handleDelete(exercise._id, exercise.name_pl)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="btn-group">
                <button
                  className="btn btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  «
                </button>
                <button className="btn btn-sm">
                  Strona {page} z {totalPages}
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Dodaj nowe ćwiczenie</h3>
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">API ID</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={newExercise.apiId}
                    onChange={(e) => setNewExercise({ ...newExercise, apiId: e.target.value })}
                    placeholder="np. exercise_001"
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Nazwa EN</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Nazwa PL</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={newExercise.name_pl}
                    onChange={(e) => setNewExercise({ ...newExercise, name_pl: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Część ciała</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={newExercise.bodyPart}
                    onChange={(e) => setNewExercise({ ...newExercise, bodyPart: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Target</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={newExercise.target}
                    onChange={(e) => setNewExercise({ ...newExercise, target: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Sprzęt</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={newExercise.equipment}
                    onChange={(e) => setNewExercise({ ...newExercise, equipment: e.target.value })}
                  />
                </div>
                <div className="form-control col-span-2">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Trudność (1-10)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input input-bordered input-sm"
                    value={newExercise.difficulty}
                    onChange={(e) =>
                      setNewExercise({ ...newExercise, difficulty: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowCreateModal(false)}>
                Anuluj
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingExercise && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Edytuj ćwiczenie</h3>
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Nazwa EN</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={editingExercise.name}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Nazwa PL</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={editingExercise.name_pl}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, name_pl: e.target.value })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Część ciała</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={editingExercise.bodyPart}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, bodyPart: e.target.value })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Target</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={editingExercise.target}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, target: e.target.value })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Sprzęt</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={editingExercise.equipment}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, equipment: e.target.value })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label mb-3">
                    <span className="label-text pr-4">Trudność (1-10)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input input-bordered input-sm"
                    value={editingExercise.difficulty}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        difficulty: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowEditModal(false)}>
                Anuluj
              </button>
              <button className="btn btn-primary" onClick={handleUpdate}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
