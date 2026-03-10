import { useEffect, useState, useCallback } from 'react';
import { adminService, type AdminUser } from '../../../services/admin.service';
import { 
  Search,
  Users, 
  Edit2, 
  Trash2, 
  Lock, 
  Unlock, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [blockedFilter, setBlockedFilter] = useState<string>('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getUsers(
        page,
        20,
        search || undefined,
        roleFilter || undefined,
        blockedFilter === 'true' ? true : blockedFilter === 'false' ? false : undefined,
      );
      setUsers(response.users);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error: unknown) {
      console.error('Błąd ładowania użytkowników:', error);
      setError((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Nie udało się załadować użytkowników');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, blockedFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleBlock = async (user: AdminUser) => {
    try {
      const result = await adminService.toggleBlockUser(user._id);
      alert(result.message);
      loadUsers();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Wystąpił błąd');
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika ${user.email}?`)) {
      return;
    }

    try {
      await adminService.deleteUser(user._id);
      alert('Użytkownik został usunięty');
      loadUsers();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Wystąpił błąd');
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await adminService.updateUser(editingUser._id, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role as 'user' | 'admin',
      });
      alert('Użytkownik został zaktualizowany');
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Wystąpił błąd');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Zarządzanie użytkownikami</h1>
          <p className="text-base-content/70">Zarządzaj kontami użytkowników systemu</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="form-control flex-1">
              <label className="label mb-3">
                <span className="label-text pr-4">Szukaj</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Email lub nazwa..."
                  className="input input-bordered w-full pl-4"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Rola</span>
              </label>
              <select
                className="select select-bordered"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Wszystkie</option>
                <option value="user">Użytkownik</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Status</span>
              </label>
              <select
                className="select select-bordered"
                value={blockedFilter}
                onChange={(e) => {
                  setBlockedFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Wszystkie</option>
                <option value="false">Aktywne</option>
                <option value="true">Zablokowane</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-base-content/70">
            Znaleziono <span className="font-semibold">{total}</span> użytkowników
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body overflow-x-auto p-0">
          {error ? (
            <div className="p-8">
              <div className="alert alert-error">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-bold">Błąd</h3>
                    <div className="text-sm">{error}</div>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={loadUsers}>
                  Spróbuj ponownie
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="mx-auto h-16 w-16 text-base-content/20" />
              <p className="mt-4 text-base-content/60">Nie znaleziono użytkowników</p>
              {(search || roleFilter || blockedFilter) && (
                <button 
                  className="btn btn-sm btn-ghost mt-4"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('');
                    setBlockedFilter('');
                  }}
                >
                  Wyczyść filtry
                </button>
              )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nazwa</th>
                  <th>Rola</th>
                  <th>Status</th>
                  <th>Data rejestracji</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="hover">
                    <td>
                      <div className="font-semibold">{user.email}</div>
                    </td>
                    <td>{user.name || '—'}</td>
                    <td>
                      <div
                        className={`badge ${
                          user.role === 'admin' ? 'badge-primary' : 'badge-ghost'
                        }`}
                      >
                        {user.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                      </div>
                    </td>
                    <td>
                      <div
                        className={`badge ${
                          user.isBlocked ? 'badge-error' : 'badge-success'
                        }`}
                      >
                        {user.isBlocked ? 'Zablokowany' : 'Aktywny'}
                      </div>
                    </td>
                    <td className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleEdit(user)}
                          title="Edytuj"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          className={`btn btn-ghost btn-sm ${
                            user.isBlocked ? 'text-success' : 'text-warning'
                          }`}
                          onClick={() => handleToggleBlock(user)}
                          title={user.isBlocked ? 'Odblokuj' : 'Zablokuj'}
                          disabled={user.role === 'admin'}
                        >
                          {user.isBlocked ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => handleDelete(user)}
                          title="Usuń"
                          disabled={user.role === 'admin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm">
            Strona {page} z {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Edytuj użytkownika</h3>
            <div className="form-control mt-4">
              <label className="label mb-3">
                <span className="label-text pr-5.5">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                value={editingUser.email}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, email: e.target.value })
                }
              />
            </div>
            <div className="form-control mt-4">
              <label className="label mb-3">
                <span className="label-text pr-3">Nazwa</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={editingUser.name || ''}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, name: e.target.value })
                }
              />
            </div>
            <div className="form-control mt-4">
              <label className="label mb-3">
                <span className="label-text pr-7">Rola</span>
              </label>
              <select
                className="select select-bordered"
                value={editingUser.role}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, role: e.target.value })
                }
              >
                <option value="user">Użytkownik</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowEditModal(false)}>
                Anuluj
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
