import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Mail, 
  Database,
  Dumbbell,
  Info,
  Server,
  AlertCircle
} from 'lucide-react';

interface SettingsFormData {
  appName: string;
  appDescription: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  defaultTrainingDays: string;
  defaultTrainingLevel: string;
  defaultGoal: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<SettingsFormData>({
    appName: 'Wirtualny Trener',
    appDescription: 'Platforma treningowa z AI',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    defaultTrainingDays: '3',
    defaultTrainingLevel: 'intermediate',
    defaultGoal: 'general',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Implement settings update API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Nie udało się zapisać ustawień');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-base-content">Ustawienia systemu</h1>
        <p className="text-base-content/70">Konfiguracja aplikacji</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Ustawienia zostały zapisane pomyślnie</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="h-6 w-6" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Ustawienia ogólne</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Nazwa aplikacji</span>
                </label>
                <input
                  type="text"
                  name="appName"
                  value={settings.appName}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="Wirtualny Trener"
                />
              </div>

              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">Opis aplikacji</span>
                </label>
                <textarea
                  name="appDescription"
                  value={settings.appDescription}
                  onChange={handleChange}
                  className="textarea textarea-bordered"
                  rows={2}
                  placeholder="Krótki opis aplikacji..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Email/SMTP Settings */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Konfiguracja email (SMTP)</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Host SMTP</span>
                </label>
                <input
                  type="text"
                  name="smtpHost"
                  value={settings.smtpHost}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Port SMTP</span>
                </label>
                <input
                  type="text"
                  name="smtpPort"
                  value={settings.smtpPort}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="587"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Użytkownik SMTP</span>
                </label>
                <input
                  type="email"
                  name="smtpUser"
                  value={settings.smtpUser}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Hasło SMTP</span>
                </label>
                <input
                  type="password"
                  name="smtpPassword"
                  value={settings.smtpPassword}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="alert alert-info mt-4">
              <Info className="h-5 w-5" />
              <span className="text-sm">
                Te ustawienia są obecnie konfigurowane przez zmienne środowiskowe w pliku .env
              </span>
            </div>
          </div>
        </div>

        {/* Training Defaults */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <Dumbbell className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Domyślne ustawienia treningowe</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Domyślna liczba dni</span>
                </label>
                <select
                  name="defaultTrainingDays"
                  value={settings.defaultTrainingDays}
                  onChange={handleChange}
                  className="select select-bordered"
                >
                  <option value="2">2 dni/tydzień</option>
                  <option value="3">3 dni/tydzień</option>
                  <option value="4">4 dni/tydzień</option>
                  <option value="5">5 dni/tydzień</option>
                  <option value="6">6 dni/tydzień</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Domyślny poziom</span>
                </label>
                <select
                  name="defaultTrainingLevel"
                  value={settings.defaultTrainingLevel}
                  onChange={handleChange}
                  className="select select-bordered"
                >
                  <option value="beginner">Początkujący</option>
                  <option value="intermediate">Średniozaawansowany</option>
                  <option value="advanced">Zaawansowany</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Domyślny cel</span>
                </label>
                <select
                  name="defaultGoal"
                  value={settings.defaultGoal}
                  onChange={handleChange}
                  className="select select-bordered"
                >
                  <option value="general">Ogólny</option>
                  <option value="strength">Siła</option>
                  <option value="hypertrophy">Masa</option>
                  <option value="calisthenics">Kalistenika</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <Server className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Informacje systemowe</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-primary">
                  <Database className="h-8 w-8" />
                </div>
                <div className="stat-title">Wersja backend</div>
                <div className="stat-value text-2xl">v1.0.0</div>
                <div className="stat-desc">Node.js + NestJS</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-secondary">
                  <SettingsIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Wersja frontend</div>
                <div className="stat-value text-2xl">v1.0.0</div>
                <div className="stat-desc">React + Vite</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-accent">
                  <Database className="h-8 w-8" />
                </div>
                <div className="stat-title">Baza danych</div>
                <div className="stat-value text-2xl">MongoDB</div>
                <div className="stat-desc">Cloud Atlas</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-info">
                  <Info className="h-8 w-8" />
                </div>
                <div className="stat-title">Status systemu</div>
                <div className="stat-value text-2xl">Online</div>
                <div className="stat-desc">Wszystko działa poprawnie</div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Zapisz ustawienia
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
